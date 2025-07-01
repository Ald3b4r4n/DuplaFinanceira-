import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, updateDoc,
  deleteDoc, query, orderBy, setDoc, arrayUnion, arrayRemove, getDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBqCkYz0Ww4_zMPQgHU7jKlYrW4seQhBOM",
  authDomain: "duplafinanceira-e6348.firebaseapp.com",
  projectId: "duplafinanceira-e6348",
  storageBucket: "duplafinanceira-e6348.appspot.com",
  messagingSenderId: "831304954336",
  appId: "1:831304954336:web:8cd90bda88ca75c19bfb85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let graficoBarras, graficoPizza;

// ==================== FUNÇÕES PRINCIPAIS ====================

function mostrarPopup(mensagem, cor = '#4CAF50') {
  const popup = document.createElement('div');
  popup.textContent = mensagem;
  popup.style.position = 'fixed';
  popup.style.bottom = '20px';
  popup.style.right = '20px';
  popup.style.backgroundColor = cor;
  popup.style.color = '#fff';
  popup.style.padding = '10px 20px';
  popup.style.borderRadius = '8px';
  popup.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  popup.style.zIndex = '1000';
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => document.body.removeChild(popup), 500);
  }, 2000);
}

function formatarValor(valor) {
  if (typeof valor === 'string' && valor.includes(',')) {
    valor = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
  }
  
  return parseFloat(valor).toFixed(2)
    .replace('.', ',')
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function calcularProximaRecorrencia() {
  if (!document.getElementById("recorrente").checked) return null;
  
  const dataInput = document.getElementById("data").value;
  const tipo = document.getElementById("tipo-recorencia").value;
  
  const dataObj = new Date(dataInput);
  const data = new Date(dataObj.getTime() + Math.abs(dataObj.getTimezoneOffset() * 60000));
  
  if (tipo === "semanal") {
    data.setDate(data.getDate() + 7);
  } else if (tipo === "mensal") {
    data.setMonth(data.getMonth() + 1);
  }
  
  return data.toISOString().split('T')[0];
}

function calcularNovaProximaRecorrencia(dataString, tipo) {
  const dataObj = new Date(dataString);
  const novaData = new Date(dataObj.getTime() + Math.abs(dataObj.getTimezoneOffset() * 60000));
  
  if (tipo === "semanal") {
    novaData.setDate(novaData.getDate() + 7);
  } else if (tipo === "mensal") {
    novaData.setMonth(novaData.getMonth() + 1);
  }
  
  return novaData.toISOString().split('T')[0];
}

// ==================== FUNÇÕES DE EDIÇÃO ====================

function mostrarPopupEdicao(id, valorAtual, descricaoAtual) {
  const popup = document.createElement('div');
  popup.id = 'popup-edicao';
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.backgroundColor = 'white';
  popup.style.padding = '20px';
  popup.style.borderRadius = '8px';
  popup.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
  popup.style.zIndex = '1000';
  popup.style.width = '300px';
  
  popup.innerHTML = `
    <h3 style="margin-top: 0; color: var(--verde-escuro)">Editar Transação</h3>
    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Descrição</label>
      <input type="text" id="editar-descricao" value="${descricaoAtual}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Valor</label>
      <input type="text" id="editar-valor" value="${formatarValor(valorAtual)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 10px;">
      <button id="cancelar-edicao" style="padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
      <button id="salvar-edicao" style="padding: 8px 15px; background: var(--verde-claro); color: white; border: none; border-radius: 4px; cursor: pointer;">Salvar</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  const valorInput = document.getElementById('editar-valor');
  valorInput.focus();
  valorInput.select();
  
  document.getElementById('cancelar-edicao').addEventListener('click', () => {
    document.body.removeChild(popup);
  });
  
  document.getElementById('salvar-edicao').addEventListener('click', () => {
    const novaDescricao = document.getElementById('editar-descricao').value.trim();
    let novoValor = document.getElementById('editar-valor').value.replace(/\./g, '').replace(',', '.');
    
    if (!novoValor.includes('.')) {
      novoValor = parseFloat(novoValor).toFixed(2);
    }
    
    if (!novaDescricao || isNaN(parseFloat(novoValor))) {
      mostrarPopup("❌ Preencha todos os campos corretamente!", "#f44336");
      return;
    }
    
    atualizarTransacao(id, novaDescricao, parseFloat(novoValor));
    document.body.removeChild(popup);
  });
  
  popup.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(popup);
    }
  });
}

async function atualizarTransacao(id, novaDescricao, novoValor) {
  try {
    const transacaoRef = doc(db, "Transacoes", id);
    const transacaoSnap = await getDoc(transacaoRef);
    const transacao = transacaoSnap.data();
    
    await updateDoc(transacaoRef, {
      descricao: novaDescricao,
      valor: novoValor
    });
    
    mostrarPopup("✅ Transação atualizada!");
    carregarTransacoes();
    carregarTransacoesPagas();
    carregarResumoMensal();
    carregarGraficos();
    
    if (transacao.tipo === 'receita') {
      await atualizarMetasComReceita(novoValor - transacao.valor);
    }
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    mostrarPopup("❌ Erro ao atualizar transação!", "#f44336");
  }
}

// ==================== FUNÇÕES DE TRANSAÇÕES ====================

async function adicionarTransacao() {
  const tipo = document.getElementById("tipo-transacao").value;
  const dataInput = document.getElementById("data").value;
  const valorInput = document.getElementById("valor").value.replace(/\./g, '').replace(',', '.');
  
  if (!dataInput || !document.getElementById("descricao").value || !valorInput) {
    mostrarPopup("❌ Preencha todos os campos!", "#f44336");
    return;
  }

  const dataObj = new Date(dataInput);
  const dataCorrigida = new Date(dataObj.getTime() + Math.abs(dataObj.getTimezoneOffset() * 60000));
  
  const transacao = {
    data: dataCorrigida.toISOString().split('T')[0],
    dataExibicao: dataCorrigida.toLocaleDateString('pt-BR'),
    descricao: document.getElementById("descricao").value,
    valor: parseFloat(valorInput),
    categoria: document.getElementById("categoria").value,
    responsavel: document.getElementById("responsavel").value,
    tipo: tipo,
    pago: tipo === 'receita',
    recorrente: document.getElementById("recorrente").checked,
    tipoRecorrencia: document.getElementById("recorrente").checked 
      ? document.getElementById("tipo-recorencia").value 
      : null,
    proximaRecorrencia: calcularProximaRecorrencia(),
    dataOriginal: dataCorrigida.toISOString().split('T')[0]
  };

  try {
    await addDoc(collection(db, "Transacoes"), transacao);
    mostrarPopup("✅ Transação salva!");
    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";
    document.getElementById("recorrente").checked = false;
    document.getElementById("tipo-recorencia").disabled = true;
    carregarTransacoes();
    carregarTransacoesPagas();
    
    if (tipo === 'receita') {
      await atualizarMetasComReceita(transacao.valor);
    }
  } catch (error) {
    console.error("Erro ao salvar:", error);
    mostrarPopup("❌ Erro ao salvar!", "#f44336");
  }
}

async function carregarTransacoes() {
  try {
    const q = query(collection(db, "Transacoes"), orderBy("data", "desc"));
    const querySnapshot = await getDocs(q);
    let tabelaHTML = "";
    
    querySnapshot.forEach((docItem) => {
      const data = docItem.data();
      if ((!data.pago && data.tipo === 'gasto') || data.tipo === 'receita') {
        tabelaHTML += `
          <tr>
            <td>${data.dataExibicao}</td>
            <td>${data.descricao} ${data.recorrente ? '<span class="recorrente-badge">Recorrente</span>' : ''}</td>
            <td class="${data.tipo === 'receita' ? 'receita' : 'gasto'}" 
                onclick="window.mostrarPopupEdicao('${docItem.id}', ${data.valor}, '${data.descricao.replace(/'/g, "\\'")}')"
                style="cursor: pointer; text-decoration: underline;">
              R$ ${formatarValor(data.valor)}
            </td>
            <td>${data.categoria}</td>
            <td>${data.responsavel}</td>
            <td>${data.tipo === 'receita' ? '✔️ Recebido' : `
              <label class="switch">
                <input type="checkbox" onchange="window.alternarStatusPagamento('${docItem.id}', this.checked)">
                <span class="slider round"></span>
              </label>
            `}</td>
            <td>${data.recorrente ? (data.tipoRecorrencia === "semanal" ? "🔁 Semanal" : "🔁 Mensal") : '❌'}</td>
            <td><button class="delete-btn" onclick="window.removerTransacao('${docItem.id}')">🗑️</button></td>
          </tr>
        `;
      }
    });
    
    document.getElementById("corpo-tabela").innerHTML = tabelaHTML || '<tr><td colspan="8">Nenhuma transação pendente</td></tr>';
  } catch (error) {
    console.error("Erro ao carregar:", error);
    mostrarPopup("❌ Erro ao carregar transações!", "#f44336");
  }
}

async function carregarTransacoesPagas() {
  try {
    const q = query(collection(db, "Transacoes"), orderBy("data", "desc"));
    const querySnapshot = await getDocs(q);
    let tabelaHTML = "";
    
    querySnapshot.forEach((docItem) => {
      const data = docItem.data();
      if (data.pago && data.tipo === 'gasto') {
        tabelaHTML += `
          <tr>
            <td>${data.dataExibicao}</td>
            <td>${data.descricao} ${data.recorrente ? '<span class="recorrente-badge">Recorrente</span>' : ''}</td>
            <td class="gasto" 
                onclick="window.mostrarPopupEdicao('${docItem.id}', ${data.valor}, '${data.descricao.replace(/'/g, "\\'")}')"
                style="cursor: pointer; text-decoration: underline;">
              R$ ${formatarValor(data.valor)}
            </td>
            <td>${data.categoria}</td>
            <td>${data.responsavel}</td>
            <td>✔️ Pago</td>
            <td>${data.recorrente ? (data.tipoRecorrencia === "semanal" ? "🔁 Semanal" : "🔁 Mensal") : '❌'}</td>
            <td><button class="delete-btn" onclick="window.removerTransacao('${docItem.id}')">🗑️</button></td>
          </tr>
        `;
      }
    });
    
    document.getElementById("corpo-tabela-pagas").innerHTML = tabelaHTML || '<tr><td colspan="8">Nenhuma transação paga</td></tr>';
  } catch (error) {
    console.error("Erro ao carregar:", error);
    mostrarPopup("❌ Erro ao carregar transações pagas!", "#f44336");
  }
}

async function alternarStatusPagamento(id, statusAtual) {
  try {
    const transacaoRef = doc(db, "Transacoes", id);
    const transacaoSnap = await getDoc(transacaoRef);
    const transacao = transacaoSnap.data();

    if (transacao.tipo === 'receita') {
      mostrarPopup("❌ Receitas não podem ser marcadas como pagas/pendentes!", "#f44336");
      return;
    }

    await updateDoc(transacaoRef, { pago: statusAtual });

    if (statusAtual && transacao.recorrente) {
      const novaData = new Date(transacao.proximaRecorrencia || transacao.dataOriginal);
      const novaTransacao = {
        ...transacao,
        data: novaData.toISOString().split('T')[0],
        dataExibicao: novaData.toLocaleDateString('pt-BR'),
        dataOriginal: novaData.toISOString().split('T')[0],
        pago: false,
        proximaRecorrencia: calcularNovaProximaRecorrencia(novaData, transacao.tipoRecorrencia)
      };
      
      await addDoc(collection(db, "Transacoes"), novaTransacao);
    }

    mostrarPopup(`✅ Transação marcada como ${statusAtual ? 'paga' : 'não paga'}!`);
    carregarTransacoes();
    carregarTransacoesPagas();
    carregarResumoMensal();
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    mostrarPopup("❌ Erro ao atualizar!", "#f44336");
  }
}

async function removerTransacao(id) {
  if (confirm("Tem certeza que deseja excluir esta transação?")) {
    try {
      const transacaoRef = doc(db, "Transacoes", id);
      const transacaoSnap = await getDoc(transacaoRef);
      const transacao = transacaoSnap.data();
      
      await deleteDoc(transacaoRef);
      
      if (transacao.tipo === 'receita') {
        await atualizarMetasComReceita(-transacao.valor);
      }
      
      mostrarPopup("✅ Transação excluída!", "#f44336");
      carregarTransacoes();
      carregarTransacoesPagas();
      carregarResumoMensal();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      mostrarPopup("❌ Erro ao excluir!", "#f44336");
    }
  }
}

// ==================== FUNÇÕES DE RESUMO ====================

async function carregarResumoMensal(mes = null, ano = null) {
  try {
    const querySnapshot = await getDocs(collection(db, "Transacoes"));
    let totalReceitas = 0;
    let totalGastos = 0;
    let totalGastosPendentes = 0;

    querySnapshot.forEach(docItem => {
      const transacao = docItem.data();
      const transacaoDate = new Date(transacao.dataOriginal || transacao.data);
      const transacaoMes = transacaoDate.getMonth() + 1;
      const transacaoAno = transacaoDate.getFullYear();
      
      const deveIncluir = (!mes || transacaoMes == mes) && (!ano || transacaoAno == ano);
      
      if (deveIncluir) {
        if (transacao.tipo === "receita") {
          totalReceitas += transacao.valor;
        }
        if (transacao.tipo === "gasto") {
          totalGastos += transacao.valor;
          if (!transacao.pago) totalGastosPendentes += transacao.valor;
        }
      }
    });

    const saldo = totalReceitas - totalGastos;
    document.getElementById("resumo-mensal").innerHTML = `
      <div class="resumo-card"><h3>Receitas:</h3><p>R$ ${formatarValor(totalReceitas)}</p></div>
      <div class="resumo-card"><h3>Gastos:</h3><p>R$ ${formatarValor(totalGastos)}</p>
      <small>Pendentes: R$ ${formatarValor(totalGastosPendentes)}</small></div>
      <div class="resumo-card"><h3>Saldo:</h3><p>R$ ${formatarValor(saldo)}</p></div>
    `;
  } catch (error) {
    console.error("Erro ao carregar resumo:", error);
    mostrarPopup("❌ Erro ao carregar resumo!", "#f44336");
  }
}

// ==================== FUNÇÕES DE METAS ====================

async function atualizarMetasComReceita(diferenca) {
  try {
    const querySnapshot = await getDocs(collection(db, "Metas"));
    const batch = writeBatch(db);
    const metasCompletas = [];
    
    querySnapshot.forEach((docItem) => {
      const meta = docItem.data();
      const novoProgresso = Math.max(0, meta.progresso + diferenca);
      
      batch.update(doc(db, "Metas", docItem.id), { progresso: novoProgresso });
      
      if (novoProgresso >= meta.valor && meta.progresso < meta.valor) {
        metasCompletas.push({ id: docItem.id, nome: meta.nome });
      }
    });
    
    await batch.commit();
    carregarMetas();
    
    // Mostrar alertas para metas completadas
    metasCompletas.forEach(meta => {
      setTimeout(() => {
        if (confirm(`Meta "${meta.nome}" foi completada! Deseja excluí-la?`)) {
          excluirMeta(meta.id);
        } else {
          mostrarPopup(`✅ Meta "${meta.nome}" completada!`, "#4CAF50");
        }
      }, 500);
    });
  } catch (error) {
    console.error("Erro ao atualizar metas:", error);
    mostrarPopup("❌ Erro ao atualizar metas!", "#f44336");
  }
}

async function carregarMetas() {
  try {
    // Calcular total de todas as receitas
    const transacoesSnapshot = await getDocs(collection(db, "Transacoes"));
    const totalReceitas = transacoesSnapshot.docs
      .filter(doc => doc.data().tipo === "receita")
      .reduce((sum, doc) => sum + doc.data().valor, 0);

    // Carregar e atualizar metas
    const metasSnapshot = await getDocs(collection(db, "Metas"));
    let html = "";
    
    const batch = writeBatch(db);
    metasSnapshot.forEach(docItem => {
      const meta = docItem.data();
      const novoProgresso = Math.min(meta.valor, Math.max(meta.progresso, totalReceitas));
      
      batch.update(doc(db, "Metas", docItem.id), { progresso: novoProgresso });
      
      const porcentagem = Math.min(100, (novoProgresso / meta.valor) * 100).toFixed(1);
      const metaCompleta = novoProgresso >= meta.valor;
      
      html += `
        <div class="meta-card ${metaCompleta ? 'meta-completa' : ''}">
          <h3>${meta.nome}</h3>
          <p>R$ ${formatarValor(novoProgresso)} / R$ ${formatarValor(meta.valor)}</p>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${porcentagem}%">${porcentagem}%</div>
          </div>
          <button onclick="window.excluirMeta('${docItem.id}')">🗑️ Excluir Meta</button>
        </div>
      `;
    });
    
    await batch.commit();
    document.getElementById("lista-metas").innerHTML = html || "<p>Nenhuma meta cadastrada</p>";
  } catch (error) {
    console.error("Erro ao carregar metas:", error);
    mostrarPopup("❌ Erro ao carregar metas!", "#f44336");
  }
}

async function adicionarMeta() {
  const nome = document.getElementById("meta-nome").value.trim();
  const valorInput = document.getElementById("meta-valor").value.replace(/\./g, '').replace(',', '.');
  const valor = parseFloat(valorInput);
  
  if (!nome || isNaN(valor)) {
    mostrarPopup("❌ Preencha todos os campos corretamente!", "#f44336");
    return;
  }

  if (valor <= 0) {
    mostrarPopup("❌ O valor da meta deve ser maior que zero!", "#f44336");
    return;
  }

  try {
    // Verifica se já existe meta com mesmo nome
    const metasSnapshot = await getDocs(collection(db, "Metas"));
    const metaExistente = metasSnapshot.docs.find(doc => 
      doc.data().nome.toLowerCase() === nome.toLowerCase()
    );
    
    if (metaExistente) {
      mostrarPopup("❌ Já existe uma meta com este nome!", "#f44336");
      return;
    }

    await addDoc(collection(db, "Metas"), { 
      nome, 
      valor, 
      progresso: 0,
      dataCriacao: new Date().toISOString()
    });
    
    document.getElementById("meta-nome").value = "";
    document.getElementById("meta-valor").value = "";
    carregarMetas();
    mostrarPopup("✅ Meta adicionada com sucesso!");
  } catch (error) {
    console.error("Erro ao adicionar meta:", error);
    mostrarPopup("❌ Erro ao adicionar meta!", "#f44336");
  }
}

async function excluirMeta(id) {
  if (confirm("Tem certeza que deseja excluir esta meta?")) {
    try {
      await deleteDoc(doc(db, "Metas", id));
      carregarMetas();
      mostrarPopup("✅ Meta excluída!", "#f44336");
    } catch (error) {
      console.error("Erro ao excluir meta:", error);
      mostrarPopup("❌ Erro ao excluir meta!", "#f44336");
    }
  }
}

// ==================== FUNÇÕES DE CATEGORIAS ====================

async function carregarCategorias() {
  const tipo = document.getElementById("tipo-transacao").value;
  try {
    const docRef = doc(db, "Categorias", `${tipo}_categorias`);
    const docSnap = await getDoc(docRef);
    const select = document.getElementById("categoria");
    
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    
    if (docSnap.exists() && docSnap.data().itens) {
      docSnap.data().itens.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
    mostrarPopup("❌ Erro ao carregar categorias!", "#f44336");
  }
}

async function carregarCategoriasGerenciar() {
  const tipo = document.getElementById("tipo-categoria").value;
  try {
    const docRef = doc(db, "Categorias", `${tipo}_categorias`);
    const docSnap = await getDoc(docRef);
    const select = document.getElementById("categoria-existente");
    
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    
    if (docSnap.exists() && docSnap.data().itens) {
      docSnap.data().itens.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
    mostrarPopup("❌ Erro ao carregar categorias!", "#f44336");
  }
}

async function adicionarCategoria() {
  const tipo = document.getElementById("tipo-categoria").value;
  const novaCategoria = document.getElementById("nova-categoria").value.trim();
  
  if (!novaCategoria) {
    mostrarPopup("❌ Digite um nome para a categoria!", "#f44336");
    return;
  }

  const docRef = doc(db, "Categorias", `${tipo}_categorias`);
  try {
    await setDoc(docRef, {
      itens: arrayUnion(novaCategoria)
    }, { merge: true });

    document.getElementById("nova-categoria").value = "";
    carregarCategoriasGerenciar();
    carregarCategorias();
    mostrarPopup("✅ Categoria adicionada!");
  } catch (error) {
    console.error("Erro ao adicionar categoria:", error);
    mostrarPopup("❌ Erro ao adicionar categoria!", "#f44336");
  }
}

async function removerCategoria() {
  const tipo = document.getElementById("tipo-categoria").value;
  const categoria = document.getElementById("categoria-existente").value;
  
  if (!categoria) {
    mostrarPopup("❌ Selecione uma categoria válida!", "#f44336");
    return;
  }

  const docRef = doc(db, "Categorias", `${tipo}_categorias`);
  try {
    await updateDoc(docRef, {
      itens: arrayRemove(categoria)
    });
    carregarCategoriasGerenciar();
    carregarCategorias();
    mostrarPopup("✅ Categoria removida!", "#f44336");
  } catch (error) {
    console.error("Erro ao remover categoria:", error);
    mostrarPopup("❌ Erro ao remover categoria!", "#f44336");
  }
}

// ==================== FUNÇÕES DE GRÁFICOS ====================

async function carregarGraficos() {
  try {
    const querySnapshot = await getDocs(collection(db, "Transacoes"));
    const dados = querySnapshot.docs.map(doc => doc.data());

    const receitas = dados.filter(t => t.tipo === "receita").reduce((sum, t) => sum + t.valor, 0);
    const gastos = dados.filter(t => t.tipo === "gasto").reduce((sum, t) => sum + t.valor, 0);

    const categoriasGastos = [...new Set(dados.filter(t => t.tipo === "gasto").map(t => t.categoria))];
    const valoresGastos = categoriasGastos.map(cat =>
      dados.filter(t => t.categoria === cat).reduce((sum, t) => sum + t.valor, 0)
    );

    const ctxBarras = document.getElementById("grafico-barras");
    const ctxPizza = document.getElementById("grafico-pizza");

    if (graficoBarras) graficoBarras.destroy();
    if (graficoPizza) graficoPizza.destroy();

    graficoBarras = new Chart(ctxBarras, {
      type: 'bar',
      data: {
        labels: ['Receitas', 'Gastos'],
        datasets: [{
          label: 'Valores (R$)',
          data: [receitas, gastos],
          backgroundColor: ['#4CAF50', '#F44336']
        }]
      }
    });

    graficoPizza = new Chart(ctxPizza, {
      type: 'pie',
      data: {
        labels: categoriasGastos,
        datasets: [{
          data: valoresGastos,
          backgroundColor: ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#3CB371']
        }]
      }
    });
  } catch (error) {
    console.error("Erro ao carregar gráficos:", error);
    mostrarPopup("❌ Erro ao carregar gráficos!", "#f44336");
  }
}

// ==================== FUNÇÕES DE ALERTAS ====================

async function carregarAlertas() {
  try {
    const querySnapshot = await getDocs(collection(db, "Transacoes"));
    let gastosPorCategoria = {};

    querySnapshot.forEach(docItem => {
      const t = docItem.data();
      if (t.tipo === "gasto") {
        gastosPorCategoria[t.categoria] = (gastosPorCategoria[t.categoria] || 0) + t.valor;
      }
    });

    let alertas = "";
    for (const categoria in gastosPorCategoria) {
      if (gastosPorCategoria[categoria] > 500) {
        alertas += `
          <div class="alerta-card">
            <h3>⚠️ Excesso em ${categoria}</h3>
            <p>Gastos: R$ ${formatarValor(gastosPorCategoria[categoria])}</p>
          </div>
        `;
      }
    }

    document.getElementById("alertas").innerHTML = alertas || "<p>Sem alertas financeiros no momento</p>";
  } catch (error) {
    console.error("Erro ao carregar alertas:", error);
    mostrarPopup("❌ Erro ao carregar alertas!", "#f44336");
  }
}

// ==================== FUNÇÕES DE EXPORTAÇÃO ====================

async function exportarParaPDF() {
  try {
    const mes = document.getElementById("filtro-mes").value;
    const ano = document.getElementById("filtro-ano").value;
    
    // Verificação mais robusta da biblioteca jsPDF
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
      // Tentar carregar dinamicamente se não estiver disponível
      await carregarBibliotecaJSPDF();
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Restante do código permanece o mesmo...
    doc.setFontSize(18);
    doc.setTextColor(30, 63, 32);
    doc.text("Relatório Financeiro - Dupla Financeira", 14, 15);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Período: ${mes ? `${mes}/` : ''}${ano || 'Todos'}`, 14, 25);
    doc.text(`Data do relatório: ${new Date().toLocaleDateString('pt-BR')}`, 14, 35);
    
    const q = query(collection(db, "Transacoes"), orderBy("data", "desc"));
    const querySnapshot = await getDocs(q);
    
    const dados = [];
    querySnapshot.forEach(docItem => {
      const data = docItem.data();
      const transacaoDate = new Date(data.dataOriginal || data.data);
      const transacaoMes = transacaoDate.getMonth() + 1;
      const transacaoAno = transacaoDate.getFullYear();
      
      const deveIncluir = (!mes || transacaoMes == mes) && (!ano || transacaoAno == ano);
      
      if (deveIncluir) {
        dados.push([
          data.dataExibicao,
          data.descricao,
          `R$ ${formatarValor(data.valor)}`,
          data.categoria,
          data.responsavel,
          data.tipo === 'receita' ? 'Recebido' : (data.pago ? 'Pago' : 'Pendente'),
          data.recorrente ? (data.tipoRecorrencia === "semanal" ? "Semanal" : "Mensal") : 'Não'
        ]);
      }
    });
    
    if (dados.length === 0) {
      mostrarPopup("❌ Nenhuma transação no período selecionado!", "#f44336");
      return;
    }
    
    doc.autoTable({
      head: [['Data', 'Descrição', 'Valor', 'Categoria', 'Responsável', 'Status', 'Recorrência']],
      body: dados,
      startY: 45,
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [30, 63, 32],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 248, 240]
      }
    });
    
    doc.save(`relatorio-financeiro-${mes || 'todos'}-${ano || 'anos'}.pdf`);
    mostrarPopup("✅ PDF gerado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    mostrarPopup("❌ Erro ao gerar PDF!", "#f44336");
  }
}

// Função para carregar dinamicamente a biblioteca jsPDF
function carregarBibliotecaJSPDF() {
  return new Promise((resolve, reject) => {
    if (typeof window.jspdf !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      // jsPDF agora está disponível como window.jspdf.jsPDF
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Falha ao carregar a biblioteca jsPDF'));
    };
    
    document.head.appendChild(script);
    
    // Também carrega o plugin autoTable se necessário
    const autoTableScript = document.createElement('script');
    autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
    document.head.appendChild(autoTableScript);
  });
}

async function exportarParaExcel() {
  try {
    const mes = document.getElementById("filtro-mes").value;
    const ano = document.getElementById("filtro-ano").value;
    
    const q = query(collection(db, "Transacoes"), orderBy("data", "desc"));
    const querySnapshot = await getDocs(q);
    
    let csv = 'Data,Descrição,Valor,Categoria,Responsável,Status,Recorrência\n';
    let temDados = false;
    
    querySnapshot.forEach(docItem => {
      const data = docItem.data();
      const transacaoDate = new Date(data.dataOriginal || data.data);
      const transacaoMes = transacaoDate.getMonth() + 1;
      const transacaoAno = transacaoDate.getFullYear();
      
      const deveIncluir = (!mes || transacaoMes == mes) && (!ano || transacaoAno == ano);
      
      if (deveIncluir) {
        temDados = true;
        csv += `"${data.dataExibicao}","${data.descricao.replace(/"/g, '""')}",${data.valor},"${data.categoria}","${data.responsavel}","${data.tipo === 'receita' ? 'Recebido' : (data.pago ? 'Pago' : 'Pendente')}","${data.recorrente ? (data.tipoRecorrencia === "semanal" ? "Semanal" : "Mensal") : 'Não'}"\n`;
      }
    });
    
    if (!temDados) {
      mostrarPopup("❌ Nenhuma transação no período selecionado!", "#f44336");
      return;
    }
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transacoes-${mes || 'todos'}-${ano || 'anos'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    mostrarPopup("✅ Excel gerado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar Excel:", error);
    mostrarPopup("❌ Erro ao gerar Excel!", "#f44336");
  }
}

// ==================== INICIALIZAÇÃO ====================

async function inicializar() {
  document.getElementById("tipo-transacao").addEventListener("change", carregarCategorias);
  document.getElementById("salvar-transacao").addEventListener("click", adicionarTransacao);
  document.getElementById("exportar-pdf").addEventListener("click", exportarParaPDF);
  document.getElementById("exportar-excel").addEventListener("click", exportarParaExcel);
  document.getElementById("tipo-categoria").addEventListener("change", carregarCategoriasGerenciar);
  document.getElementById("adicionar-categoria").addEventListener("click", adicionarCategoria);
  document.getElementById("remover-categoria").addEventListener("click", removerCategoria);
  document.getElementById("adicionar-meta").addEventListener("click", adicionarMeta);

  document.getElementById("valor").addEventListener('input', function() {
    let value = this.value.replace(/\D/g, '');
    if (!value.includes('.') && !value.includes(',')) {
      value = (parseInt(value) / 100).toFixed(2);
    }
    value = value.replace('.', ',');
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    this.value = value;
  });

  document.getElementById("meta-valor").addEventListener('input', function() {
    let value = this.value.replace(/\D/g, '');
    if (!value.includes('.') && !value.includes(',')) {
      value = (parseInt(value) / 100).toFixed(2);
    }
    value = value.replace('.', ',');
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    this.value = value;
  });

  document.getElementById("data").valueAsDate = new Date();

  await carregarCategorias();
  await carregarTransacoes();
  await carregarTransacoesPagas();
  await carregarMetas();
  await carregarAlertas();
  await carregarGraficos();
  await carregarResumoMensal();
}

// Exporta funções para o escopo global
window.carregarGraficos = carregarGraficos;
window.carregarResumoMensal = carregarResumoMensal;
window.carregarMetas = carregarMetas;
window.carregarAlertas = carregarAlertas;
window.carregarCategoriasGerenciar = carregarCategoriasGerenciar;
window.alternarStatusPagamento = alternarStatusPagamento;
window.removerTransacao = removerTransacao;
window.excluirMeta = excluirMeta;
window.carregarTransacoesPagas = carregarTransacoesPagas;
window.mostrarPopupEdicao = mostrarPopupEdicao;
window.atualizarTransacao = atualizarTransacao;

document.addEventListener('DOMContentLoaded', inicializar);