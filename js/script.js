// ========== DADOS INICIAIS ==========
let biblioteca = {
    usuarios: [],
    livros: [],
    emprestimos: [],
    configuracoes: {
        prazoPadrao: 7,
        notificacoes: []
    }
};

let currentUser = null;

// Carregar dados do localStorage
function loadData() {
    const stored = localStorage.getItem('bibliotecaEscolar_v5');
    if (stored) {
        biblioteca = JSON.parse(stored);
    } else {
        // USUÁRIOS INICIAIS
        biblioteca.usuarios = [
            { id: 1, nome: "Aluno Exemplo", email: "aluno@escola.com", senha: "123", perfil: "aluno", matricula: "2024001" },
            { id: 2, nome: "Bibliotecário Chefe", email: "bibliotecario@escola.com", senha: "123", perfil: "bibliotecario", matricula: "ADM001" },
            { id: 3, nome: "Funcionário João", email: "funcionario@escola.com", senha: "123", perfil: "funcionario", matricula: "FUNC001" }
        ];
        
        // LIVROS INICIAIS
        biblioteca.livros = [
            { id: 1, nome: "Dom Casmurro", autor: "Machado de Assis", isbn: "978-85-01-00001-1", categoria: "Literatura Brasileira", quantidade: 3, disponivel: 3, editora: "Editora Abril", ano: 1899 },
            { id: 2, nome: "Harry Potter", autor: "J.K. Rowling", isbn: "978-85-325-0001-2", categoria: "Fantasia", quantidade: 2, disponivel: 2, editora: "Rocco", ano: 1997 },
            { id: 3, nome: "O Pequeno Príncipe", autor: "Saint-Exupéry", isbn: "978-85-200-0001-3", categoria: "Infantil", quantidade: 4, disponivel: 4, editora: "Agir", ano: 1943 },
            { id: 4, nome: "1984", autor: "George Orwell", isbn: "978-85-250-0001-4", categoria: "Distopia", quantidade: 2, disponivel: 2, editora: "Companhia das Letras", ano: 1949 }
        ];
        
        biblioteca.emprestimos = [];
        biblioteca.configuracoes = { prazoPadrao: 7, notificacoes: [] };
        saveData();
    }
    
    // Inicializar contadores
    if (!localStorage.getItem('bibliotecaNextId_v5')) {
        let nextId = { usuario: biblioteca.usuarios.length + 1, livro: biblioteca.livros.length + 1, emprestimo: 1 };
        localStorage.setItem('bibliotecaNextId_v5', JSON.stringify(nextId));
    }
}

function saveData() {
    localStorage.setItem('bibliotecaEscolar_v5', JSON.stringify(biblioteca));
}

function getNextId(tipo) {
    let next = JSON.parse(localStorage.getItem('bibliotecaNextId_v5')) || { usuario: 1, livro: 1, emprestimo: 1 };
    let id = next[tipo];
    next[tipo]++;
    localStorage.setItem('bibliotecaNextId_v5', JSON.stringify(next));
    return id;
}

function addNotification(userId, title, message, type = 'info') {
    const notification = {
        id: Date.now(),
        userId,
        title,
        message,
        type,
        read: false,
        data: new Date().toISOString()
    };
    biblioteca.configuracoes.notificacoes.push(notification);
    saveData();
    updateNotificationBadge();
}

function updateNotificationBadge() {
    if (!currentUser) return;
    const unread = biblioteca.configuracoes.notificacoes.filter(n => n.userId === currentUser.id && !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) badge.textContent = unread;
}

function checkExpiredLoans() {
    const hoje = new Date().toISOString().slice(0, 10);
    const ativos = biblioteca.emprestimos.filter(e => e.ativo === true);
    
    ativos.forEach(e => {
        if (e.dataDevolucaoPrevista < hoje) {
            const usuario = biblioteca.usuarios.find(u => u.id === e.idUsuario);
            const livro = biblioteca.livros.find(l => l.id === e.idLivro);
            if (usuario) {
                addNotification(usuario.id, '⚠️ Livro Atrasado', `O livro "${livro?.nome}" está com atraso.`, 'warning');
            }
        }
    });
}

function atualizarDisponibilidadeLivro(idLivro) {
    let livro = biblioteca.livros.find(l => l.id === idLivro);
    if (livro) {
        let emprestados = biblioteca.emprestimos.filter(e => e.idLivro === idLivro && e.ativo === true).length;
        livro.disponivel = livro.quantidade - emprestados;
        if (livro.disponivel < 0) livro.disponivel = 0;
        saveData();
    }
}

// ========== PAINEL DO ALUNO (e FUNCIONÁRIO) ==========
function renderAlunoDashboard() {
    if (!currentUser || (currentUser.perfil !== 'aluno' && currentUser.perfil !== 'funcionario')) return;
    
    const meusEmprestimos = biblioteca.emprestimos.filter(e => e.idUsuario === currentUser.id);
    const ativos = meusEmprestimos.filter(e => e.ativo === true);
    const historico = meusEmprestimos.filter(e => e.ativo === false);
    const hoje = new Date().toISOString().slice(0, 10);
    
    // Empréstimos ativos
    const ativosHtml = ativos.map(e => {
        const livro = biblioteca.livros.find(l => l.id === e.idLivro);
        const atrasado = e.dataDevolucaoPrevista < hoje;
        return `<div class="emprestimo-card ${atrasado ? 'atrasado' : ''}">
            <strong>📖 ${livro?.nome}</strong><br>
            <small>✍️ Autor: ${livro?.autor}</small><br>
            <small>📅 Retirada: ${e.dataRetirada}</small><br>
            <small>⏰ Devolver até: ${e.dataDevolucaoPrevista}</small><br>
            ${atrasado ? '<span class="status-badge" style="background:#fee2e2;color:#b91c1c;">⚠️ ATRASADO</span>' : '<span class="status-badge status-ativo">📌 Em andamento</span>'}
        </div>`;
    }).join('');
    const ativosContainer = document.getElementById('alunoEmprestimosAtivos');
    if (ativosContainer) ativosContainer.innerHTML = ativos.length ? ativosHtml : '<p style="color:#7f8c8d;">📭 Nenhum empréstimo ativo.</p>';
    
    // Histórico de leitura
    const historicoHtml = historico.map(e => {
        const livro = biblioteca.livros.find(l => l.id === e.idLivro);
        return `<div class="emprestimo-card">
            <strong>✅ ${livro?.nome}</strong><br>
            <small>✍️ Autor: ${livro?.autor}</small><br>
            <small>📅 Categoria: ${livro?.categoria}</small><br>
            <small>📅 Devolvido em: ${e.dataDevolucaoReal}</small>
        </div>`;
    }).join('');
    const historicoContainer = document.getElementById('alunoHistoricoLeitura');
    if (historicoContainer) historicoContainer.innerHTML = historico.length ? historicoHtml : '<p>📭 Nenhum livro devolvido ainda.</p>';
    
    // Resumo estatísticas pessoais
    const resumoContainer = document.getElementById('alunoResumo');
    if (resumoContainer) {
        resumoContainer.innerHTML = `
            <div class="stat-item"><span class="stat-number">${ativos.length}</span><span class="stat-label">Lendo agora</span></div>
            <div class="stat-item"><span class="stat-number">${historico.length}</span><span class="stat-label">Já li</span></div>
            <div class="stat-item"><span class="stat-number">${meusEmprestimos.length}</span><span class="stat-label">Total empréstimos</span></div>
        `;
    }
    
    // Recomendações baseadas nas categorias lidas
    const categoriasLidas = [...new Set(historico.map(e => {
        const livro = biblioteca.livros.find(l => l.id === e.idLivro);
        return livro?.categoria;
    }).filter(Boolean))];
    
    let recomendacoes = [];
    if (categoriasLidas.length > 0) {
        recomendacoes = biblioteca.livros.filter(l => 
            categoriasLidas.includes(l.categoria) && 
            !meusEmprestimos.some(e => e.idLivro === l.id) &&
            l.disponivel > 0
        ).slice(0, 4);
    } else {
        recomendacoes = biblioteca.livros.filter(l => l.disponivel > 0).slice(0, 4);
    }
    
    const recomendacoesHtml = recomendacoes.map(l => `
        <div class="livro-card">
            <strong>${l.nome}</strong><br>
            <small>${l.autor}</small><br>
            <small>📂 ${l.categoria}</small>
        </div>
    `).join('');
    const recomendacoesContainer = document.getElementById('alunoRecomendacoes');
    if (recomendacoesContainer) recomendacoesContainer.innerHTML = recomendacoesHtml || '<p>Continue lendo para receber recomendações!</p>';
}

function renderAlunoBusca(termo = '') {
    let results = biblioteca.livros.filter(livro =>
        livro.nome.toLowerCase().includes(termo.toLowerCase()) ||
        livro.autor.toLowerCase().includes(termo.toLowerCase()) ||
        livro.categoria.toLowerCase().includes(termo.toLowerCase())
    );
    const container = document.getElementById('alunoSearchResults');
    if (!container) return;
    if (!results.length) {
        container.innerHTML = '<p>📭 Nenhum livro encontrado.</p>';
        return;
    }
    container.innerHTML = results.map(l => `
        <div class="livro-card">
            <strong>${l.nome}</strong><br>
            <small>✍️ ${l.autor}</small><br>
            <small>📂 ${l.categoria}</small><br>
            <small>📌 Disponível: ${l.disponivel} / ${l.quantidade}</small>
        </div>
    `).join('');
}

// ========== PAINEL DO BIBLIOTECÁRIO ==========
function renderBiblioDashboard() {
    const totalLivrosEl = document.getElementById('statTotalLivros');
    const totalUsuariosEl = document.getElementById('statTotalUsuarios');
    const emprestimosAtivosEl = document.getElementById('statEmprestimosAtivos');
    const emprestimosAtrasadosEl = document.getElementById('statEmprestimosAtrasados');
    const alertasEl = document.getElementById('alertasAtraso');
    
    if (totalLivrosEl) totalLivrosEl.textContent = biblioteca.livros.length;
    if (totalUsuariosEl) totalUsuariosEl.textContent = biblioteca.usuarios.filter(u => u.perfil === 'aluno').length;
    const ativos = biblioteca.emprestimos.filter(e => e.ativo === true).length;
    if (emprestimosAtivosEl) emprestimosAtivosEl.textContent = ativos;
    const hoje = new Date().toISOString().slice(0, 10);
    const atrasados = biblioteca.emprestimos.filter(e => e.ativo === true && e.dataDevolucaoPrevista < hoje).length;
    if (emprestimosAtrasadosEl) emprestimosAtrasadosEl.textContent = atrasados;
    
    if (alertasEl) {
        const alertasHtml = biblioteca.emprestimos.filter(e => e.ativo === true && e.dataDevolucaoPrevista < hoje).map(e => {
            const livro = biblioteca.livros.find(l => l.id === e.idLivro);
            const usuario = biblioteca.usuarios.find(u => u.id === e.idUsuario);
            return `<div class="emprestimo-card atrasado">⚠️ ${usuario?.nome} - "${livro?.nome}" - Atrasado desde ${e.dataDevolucaoPrevista}</div>`;
        }).join('');
        alertasEl.innerHTML = alertasHtml || '<p>✅ Nenhum empréstimo atrasado.</p>';
    }
}

function renderBiblioBusca(termo = '') {
    let results = biblioteca.livros.filter(livro =>
        livro.nome.toLowerCase().includes(termo.toLowerCase()) ||
        livro.autor.toLowerCase().includes(termo.toLowerCase()) ||
        livro.categoria.toLowerCase().includes(termo.toLowerCase())
    );
    const container = document.getElementById('biblioSearchResults');
    if (!container) return;
    if (!results.length) {
        container.innerHTML = '<p>📭 Nenhum livro encontrado.</p>';
        return;
    }
    container.innerHTML = results.map(l => `
        <div class="livro-card">
            <strong>${l.nome}</strong><br>
            <small>✍️ ${l.autor} | ${l.categoria}</small><br>
            <small>📚 Total: ${l.quantidade} | Disponível: ${l.disponivel}</small>
        </div>
    `).join('');
}

function renderSelects() {
    const alunos = biblioteca.usuarios.filter(u => u.perfil === 'aluno');
    const selectUser = document.getElementById('selectUserEmprestimo');
    if (selectUser) selectUser.innerHTML = '<option value="">Selecione o aluno</option>' + alunos.map(u => `<option value="${u.id}">${u.nome} (${u.matricula})</option>`).join('');
    
    const disponiveis = biblioteca.livros.filter(l => l.disponivel > 0);
    const selectLivro = document.getElementById('selectLivroEmprestimo');
    if (selectLivro) selectLivro.innerHTML = '<option value="">Selecione o livro</option>' + disponiveis.map(l => `<option value="${l.id}">${l.nome} - ${l.autor} (${l.disponivel} disp.)</option>`).join('');
    
    const ativos = biblioteca.emprestimos.filter(e => e.ativo === true);
    const selectDev = document.getElementById('selectEmprestimoDevolucao');
    if (selectDev) selectDev.innerHTML = '<option value="">-- Escolha um empréstimo --</option>' + ativos.map(e => {
        const livro = biblioteca.livros.find(l => l.id === e.idLivro);
        const usuario = biblioteca.usuarios.find(u => u.id === e.idUsuario);
        return `<option value="${e.id}">${usuario?.nome} - "${livro?.nome}" (${e.dataRetirada})</option>`;
    }).join('');
}

function renderEmprestimosAtivos() {
    const ativos = biblioteca.emprestimos.filter(e => e.ativo === true);
    const hoje = new Date().toISOString().slice(0, 10);
    const container = document.getElementById('emprestimosAtivosList');
    if (!container) return;
    if (ativos.length === 0) {
        container.innerHTML = '<p>✅ Nenhum empréstimo ativo.</p>';
        return;
    }
    container.innerHTML = ativos.map(e => {
        const livro = biblioteca.livros.find(l => l.id === e.idLivro);
        const usuario = biblioteca.usuarios.find(u => u.id === e.idUsuario);
        const atrasado = e.dataDevolucaoPrevista < hoje;
        return `<div class="emprestimo-card ${atrasado ? 'atrasado' : ''}">
            <strong>${usuario?.nome}</strong> - ${livro?.nome}<br>
            <small>📅 Retirada: ${e.dataRetirada} | Devolução: ${e.dataDevolucaoPrevista} ${atrasado ? '⚠️ ATRASADO' : ''}</small>
        </div>`;
    }).join('');
}

function renderLivrosCadastro() {
    const container = document.getElementById('listaLivrosCadastro');
    if (!container) return;
    container.innerHTML = biblioteca.livros.map(l => `
        <div class="livro-card">
            <strong>${l.nome}</strong><br>
            <small>✍️ ${l.autor} | ${l.categoria}</small><br>
            <small>📚 Total: ${l.quantidade} | Disponível: ${l.disponivel}</small>
            <small>📅 Ano: ${l.ano} | Editora: ${l.editora || 'N/A'}</small>
        </div>
    `).join('');
}

function renderUsuariosLista() {
    const container = document.getElementById('listaUsuarios');
    if (!container) return;
    container.innerHTML = biblioteca.usuarios.map(u => `
        <div class="emprestimo-card">
            <strong>${u.nome}</strong><br>
            <small>📧 ${u.email} | Matrícula: ${u.matricula}</small><br>
            <small>Perfil: ${u.perfil === 'aluno' ? '👨‍🎓 Aluno' : u.perfil === 'bibliotecario' ? '📚 Bibliotecário' : '👔 Funcionário'}</small>
        </div>
    `).join('');
}

function renderEstatisticas() {
    const totalLivros = biblioteca.livros.length;
    const totalUsuarios = biblioteca.usuarios.filter(u => u.perfil === 'aluno').length;
    const totalEmprestimos = biblioteca.emprestimos.length;
    const ativos = biblioteca.emprestimos.filter(e => e.ativo).length;
    
    // Contagem de livros mais emprestados
    const contagem = {};
    biblioteca.emprestimos.forEach(e => { contagem[e.idLivro] = (contagem[e.idLivro] || 0) + 1; });
    const topLivros = Object.entries(contagem).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const topLivrosHtml = topLivros.map(([id, qtd]) => {
        const livro = biblioteca.livros.find(l => l.id == id);
        return `<div>📖 ${livro?.nome || '?'} - ${qtd} empréstimos</div>`;
    }).join('');
    
    // Contagem de usuários mais frequentes
    const contagemUser = {};
    biblioteca.emprestimos.forEach(e => { contagemUser[e.idUsuario] = (contagemUser[e.idUsuario] || 0) + 1; });
    const topUsers = Object.entries(contagemUser).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const topUsersHtml = topUsers.map(([id, qtd]) => {
        const user = biblioteca.usuarios.find(u => u.id == id);
        return `<div>👤 ${user?.nome || '?'} - ${qtd} empréstimos</div>`;
    }).join('');
    
    const statsContainer = document.getElementById('estatisticas');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-item"><span class="stat-number">${totalLivros}</span><span class="stat-label">Livros no acervo</span></div>
            <div class="stat-item"><span class="stat-number">${totalUsuarios}</span><span class="stat-label">Alunos</span></div>
            <div class="stat-item"><span class="stat-number">${totalEmprestimos}</span><span class="stat-label">Total empréstimos</span></div>
            <div class="stat-item"><span class="stat-number">${ativos}</span><span class="stat-label">Empréstimos ativos</span></div>
        `;
    }
    
    const rankingLivrosEl = document.getElementById('rankingLivros');
    const rankingLeitoresEl = document.getElementById('rankingLeitores');
    if (rankingLivrosEl) rankingLivrosEl.innerHTML = topLivrosHtml || '<p>Nenhum empréstimo registrado</p>';
    if (rankingLeitoresEl) rankingLeitoresEl.innerHTML = topUsersHtml || '<p>Nenhum dado disponível</p>';
    
    // Histórico completo
    const historicoContainer = document.getElementById('historicoCompleto');
    if (historicoContainer) {
        const historicoHtml = [...biblioteca.emprestimos].reverse().map(e => {
            const livro = biblioteca.livros.find(l => l.id === e.idLivro);
            const usuario = biblioteca.usuarios.find(u => u.id === e.idUsuario);
            const status = e.ativo ? '📌 Em andamento' : `✅ Devolvido em ${e.dataDevolucaoReal}`;
            return `<div class="emprestimo-card">${usuario?.nome} - "${livro?.nome}" - Retirada: ${e.dataRetirada} - ${status}</div>`;
        }).join('');
        historicoContainer.innerHTML = historicoHtml || '<p>Nenhum empréstimo registrado</p>';
    }
}

// ========== AÇÕES ==========
function cadastrarLivro() {
    const nome = document.getElementById('livroNome')?.value.trim();
    const autor = document.getElementById('livroAutor')?.value.trim();
    const isbn = document.getElementById('livroISBN')?.value.trim();
    const categoria = document.getElementById('livroCategoria')?.value.trim();
    const quantidade = parseInt(document.getElementById('livroQuantidade')?.value);
    const editora = document.getElementById('livroEditora')?.value.trim();
    const ano = parseInt(document.getElementById('livroAno')?.value);
    
    if (!nome || !autor || !categoria || quantidade < 1) return alert('Preencha todos os campos obrigatórios.');
    
    const novoId = getNextId('livro');
    biblioteca.livros.push({ 
        id: novoId, 
        nome, 
        autor, 
        isbn: isbn || 'N/A', 
        categoria, 
        quantidade, 
        disponivel: quantidade, 
        editora: editora || 'N/A', 
        ano: ano || new Date().getFullYear() 
    });
    saveData();
    alert('✅ Livro cadastrado com sucesso!');
    
    // Limpar campos
    document.getElementById('livroNome').value = '';
    document.getElementById('livroAutor').value = '';
    document.getElementById('livroISBN').value = '';
    document.getElementById('livroCategoria').value = '';
    document.getElementById('livroQuantidade').value = '1';
    document.getElementById('livroEditora').value = '';
    document.getElementById('livroAno').value = '';
    
    renderLivrosCadastro();
    renderSelects();
    renderBiblioBusca('');
}

function cadastrarUsuario() {
    const nome = document.getElementById('usuarioNome')?.value.trim();
    const email = document.getElementById('usuarioEmail')?.value.trim();
    const matricula = document.getElementById('usuarioMatricula')?.value.trim();
    const perfil = document.getElementById('usuarioPerfil')?.value;
    const senha = document.getElementById('usuarioSenha')?.value.trim();
    
    if (!nome || !email || !senha || !matricula) return alert('Preencha todos os campos.');
    if (biblioteca.usuarios.find(u => u.email === email)) return alert('E-mail já cadastrado.');
    
    const novoId = getNextId('usuario');
    biblioteca.usuarios.push({ 
        id: novoId, 
        nome, 
        email, 
        senha, 
        perfil, 
        matricula, 
        dataCadastro: new Date().toISOString().slice(0,10) 
    });
    saveData();
    alert('✅ Usuário cadastrado com sucesso!');
    
    // Limpar campos
    document.getElementById('usuarioNome').value = '';
    document.getElementById('usuarioEmail').value = '';
    document.getElementById('usuarioMatricula').value = '';
    document.getElementById('usuarioSenha').value = '123';
    
    renderUsuariosLista();
    renderSelects();
}

function realizarEmprestimo() {
    const idUsuario = parseInt(document.getElementById('selectUserEmprestimo')?.value);
    const idLivro = parseInt(document.getElementById('selectLivroEmprestimo')?.value);
    const dias = parseInt(document.getElementById('diasDevolucao')?.value || 7);
    
    if (!idUsuario || !idLivro) return alert('Selecione aluno e livro.');
    
    const livro = biblioteca.livros.find(l => l.id === idLivro);
    if (!livro || livro.disponivel <= 0) return alert('Livro não disponível.');
    
    const hoje = new Date().toISOString().slice(0, 10);
    const prevista = new Date();
    prevista.setDate(prevista.getDate() + dias);
    const dataPrev = prevista.toISOString().slice(0, 10);
    const novoId = getNextId('emprestimo');
    
    biblioteca.emprestimos.push({
        id: novoId, 
        idUsuario, 
        idLivro, 
        dataRetirada: hoje,
        dataDevolucaoPrevista: dataPrev, 
        dataDevolucaoReal: null, 
        ativo: true
    });
    
    atualizarDisponibilidadeLivro(idLivro);
    saveData();
    
    const usuario = biblioteca.usuarios.find(u => u.id === idUsuario);
    addNotification(idUsuario, '📚 Novo Empréstimo', `Você pegou o livro "${livro.nome}". Devolva até ${dataPrev}`, 'info');
    
    alert(`✅ Empréstimo realizado! Devolução até: ${dataPrev}`);
    
    renderSelects();
    renderEmprestimosAtivos();
    renderEstatisticas();
    renderLivrosCadastro();
    
    if (currentUser?.perfil === 'aluno' || currentUser?.perfil === 'funcionario') {
        renderAlunoDashboard();
    }
}

function realizarDevolucao() {
    const idEmprestimo = parseInt(document.getElementById('selectEmprestimoDevolucao')?.value);
    if (!idEmprestimo) return alert('Selecione um empréstimo.');
    
    const emprestimo = biblioteca.emprestimos.find(e => e.id === idEmprestimo);
    if (!emprestimo || !emprestimo.ativo) return alert('Empréstimo já finalizado.');
    
    emprestimo.ativo = false;
    emprestimo.dataDevolucaoReal = new Date().toISOString().slice(0, 10);
    atualizarDisponibilidadeLivro(emprestimo.idLivro);
    saveData();
    
    const livro = biblioteca.livros.find(l => l.id === emprestimo.idLivro);
    addNotification(emprestimo.idUsuario, '✅ Devolução Registrada', `Você devolveu o livro "${livro?.nome}". Obrigado!`, 'success');
    
    alert('✅ Devolução registrada com sucesso!');
    
    renderSelects();
    renderEmprestimosAtivos();
    renderEstatisticas();
    renderLivrosCadastro();
    
    if (currentUser?.perfil === 'aluno' || currentUser?.perfil === 'funcionario') {
        renderAlunoDashboard();
    }
}

function exportarDados() {
    const dataStr = JSON.stringify(biblioteca, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biblioteca_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ Backup exportado com sucesso!');
}

function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const dados = JSON.parse(e.target.result);
            biblioteca = dados;
            saveData();
            alert('✅ Dados importados com sucesso! Recarregando...');
            location.reload();
        } catch (err) {
            alert('❌ Erro ao importar arquivo.');
        }
    };
    reader.readAsText(file);
}

function resetarSistema() {
    if (confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os dados. Esta ação é irreversível. Deseja continuar?')) {
        localStorage.clear();
        alert('Sistema resetado. A página será recarregada.');
        location.reload();
    }
}

function salvarConfiguracao() {
    const novoPrazo = parseInt(document.getElementById('configPrazoPadrao')?.value);
    if (novoPrazo > 0) {
        biblioteca.configuracoes.prazoPadrao = novoPrazo;
        saveData();
        alert('✅ Configurações salvas com sucesso!');
    }
}

// ========== LOGIN ==========
function fazerLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginPassword').value.trim();
    const perfilSelecionado = document.getElementById('loginPerfil').value;
    
    const user = biblioteca.usuarios.find(u => u.email === email && u.senha === senha && u.perfil === perfilSelecionado);
    
    if (!user) {
        alert('❌ Credenciais inválidas! Verifique seu email, senha e tipo de usuário.');
        return;
    }
    
    currentUser = user;
    
    // Esconder login e mostrar sistema
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'block';
    document.getElementById('userNameDisplay').innerText = currentUser.nome;
    
    let badgeText = '';
    if (currentUser.perfil === 'aluno') badgeText = '👨‍🎓 Aluno';
    else if (currentUser.perfil === 'bibliotecario') badgeText = '📚 Bibliotecário';
    else if (currentUser.perfil === 'funcionario') badgeText = '👔 Funcionário';
    document.getElementById('userPerfilDisplay').innerHTML = badgeText;
    
    const alunoPanel = document.getElementById('alunoPanel');
    const bibliotecarioPanel = document.getElementById('bibliotecarioPanel');
    
    // ALUNO e FUNCIONÁRIO têm o MESMO painel
    if (currentUser.perfil === 'aluno' || currentUser.perfil === 'funcionario') {
        if (alunoPanel) alunoPanel.style.display = 'block';
        if (bibliotecarioPanel) bibliotecarioPanel.style.display = 'none';
        renderAlunoDashboard();
        renderAlunoBusca('');
        checkExpiredLoans();
    } 
    // BIBLIOTECÁRIO tem acesso TOTAL
    else if (currentUser.perfil === 'bibliotecario') {
        if (alunoPanel) alunoPanel.style.display = 'none';
        if (bibliotecarioPanel) bibliotecarioPanel.style.display = 'block';
        renderBiblioDashboard();
        renderBiblioBusca('');
        renderSelects();
        renderEmprestimosAtivos();
        renderLivrosCadastro();
        renderUsuariosLista();
        renderEstatisticas();
        checkExpiredLoans();
        
        // Mostrar abas administrativas
        const adminOnly = document.querySelectorAll('.admin-only');
        adminOnly.forEach(el => el.style.display = 'inline-block');
    }
    
    updateNotificationBadge();
}

function logout() {
    currentUser = null;
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('mainPanel').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    
    // Fechar painel de notificações se estiver aberto
    const notificationsPanel = document.getElementById('notificationsPanel');
    if (notificationsPanel) notificationsPanel.style.display = 'none';
}

// ========== TOGGLE PASSWORD ==========
function initTogglePassword() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('loginPassword');
    
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
}

// ========== RENDER NOTIFICAÇÕES ==========
function renderNotificationsList() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (!currentUser) {
        container.innerHTML = '<p>Faça login para ver notificações</p>';
        return;
    }
    
    const userNotifications = biblioteca.configuracoes.notificacoes.filter(n => n.userId === currentUser.id).reverse();
    
    if (userNotifications.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">📭 Nenhuma notificação</p>';
        return;
    }
    
    container.innerHTML = userNotifications.map(n => `
        <div class="notification-item ${!n.read ? 'unread' : ''}" data-id="${n.id}">
            <i class="fas ${n.type === 'warning' ? 'fa-exclamation-triangle' : n.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <div>
                <strong>${n.title}</strong>
                <p>${n.message}</p>
                <small>${new Date(n.data).toLocaleDateString()} ${new Date(n.data).toLocaleTimeString()}</small>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.notification-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.dataset.id);
            const notif = biblioteca.configuracoes.notificacoes.find(n => n.id === id);
            if (notif && !notif.read) {
                notif.read = true;
                saveData();
                updateNotificationBadge();
                renderNotificationsList();
            }
        });
    });
}

// ========== INICIALIZAÇÃO ==========
window.onload = () => {
    loadData();
    initTogglePassword();
    
    // Eventos de login
    document.getElementById('btnLogin')?.addEventListener('click', fazerLogin);
    document.getElementById('btnLogout')?.addEventListener('click', logout);
    
    // Enter para login
    document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fazerLogin();
    });
    document.getElementById('loginEmail')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fazerLogin();
    });
    
    // Notificações
    document.getElementById('btnNotifications')?.addEventListener('click', () => {
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            const isVisible = panel.style.display === 'block';
            panel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) renderNotificationsList();
        }
    });
    
    document.getElementById('btnClearNotifications')?.addEventListener('click', () => {
        if (currentUser) {
            biblioteca.configuracoes.notificacoes = biblioteca.configuracoes.notificacoes.filter(n => n.userId !== currentUser.id);
            saveData();
            updateNotificationBadge();
            renderNotificationsList();
            alert('✅ Todas as notificações foram limpas!');
        }
    });
    
    // Aluno / Funcionário busca
    document.getElementById('btnAlunoSearch')?.addEventListener('click', () => {
        const termo = document.getElementById('alunoSearchInput')?.value || '';
        renderAlunoBusca(termo);
    });
    document.getElementById('alunoSearchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const termo = document.getElementById('alunoSearchInput')?.value || '';
            renderAlunoBusca(termo);
        }
    });
    
    // Bibliotecário busca
    document.getElementById('btnBiblioSearch')?.addEventListener('click', () => {
        const termo = document.getElementById('biblioSearchInput')?.value || '';
        renderBiblioBusca(termo);
    });
    document.getElementById('biblioSearchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const termo = document.getElementById('biblioSearchInput')?.value || '';
            renderBiblioBusca(termo);
        }
    });
    
    // Ações do Bibliotecário
    document.getElementById('btnCadastrarLivro')?.addEventListener('click', cadastrarLivro);
    document.getElementById('btnCadastrarUsuario')?.addEventListener('click', cadastrarUsuario);
    document.getElementById('btnRealizarEmprestimo')?.addEventListener('click', realizarEmprestimo);
    document.getElementById('btnRealizarDevolucao')?.addEventListener('click', realizarDevolucao);
    document.getElementById('btnExportarDados')?.addEventListener('click', exportarDados);
    document.getElementById('btnImportarDados')?.addEventListener('click', () => {
        document.getElementById('importFileInput')?.click();
    });
    document.getElementById('importFileInput')?.addEventListener('change', importarDados);
    document.getElementById('btnResetarDados')?.addEventListener('click', resetarSistema);
    document.getElementById('btnSalvarConfig')?.addEventListener('click', salvarConfiguracao);
    
    // Abas do Bibliotecário
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            const targetPane = document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
            if (targetPane) targetPane.classList.add('active');
            
            // Atualizar conteúdo específico
            if (tabId === 'relatorios') renderEstatisticas();
            if (tabId === 'cadastroLivro') renderLivrosCadastro();
            if (tabId === 'cadastroUsuario') renderUsuariosLista();
            if (tabId === 'emprestimos') {
                renderSelects();
                renderEmprestimosAtivos();
            }
            if (tabId === 'dashboard') renderBiblioDashboard();
        });
    });
    
    // Fechar notificações ao clicar fora
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notificationsPanel');
        const btnNotifications = document.getElementById('btnNotifications');
        if (panel && btnNotifications && panel.style.display === 'block') {
            if (!btnNotifications.contains(e.target) && !panel.contains(e.target)) {
                panel.style.display = 'none';
            }
        }
    });
    
    // Verificar atrasos a cada 30 segundos
    setInterval(() => {
        checkExpiredLoans();
        if (currentUser) {
            if (currentUser.perfil === 'aluno' || currentUser.perfil === 'funcionario') {
                renderAlunoDashboard();
            } else if (currentUser.perfil === 'bibliotecario') {
                renderBiblioDashboard();
            }
            updateNotificationBadge();
        }
    }, 30000);
    
    // Limpar versões antigas do localStorage
    if (localStorage.getItem('bibliotecaEscolar_v3') || localStorage.getItem('bibliotecaEscolar_v4')) {
        localStorage.removeItem('bibliotecaEscolar_v3');
        localStorage.removeItem('bibliotecaEscolar_v4');
    }
};