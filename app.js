import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, updateDoc,
  deleteDoc, query, orderBy, setDoc, arrayUnion, arrayRemove, getDoc
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
  return parseFloat(valor).toFixed(2)
    .replace('.', ',')
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function calcularProximaRecorrencia() {
  if (!document.getElementById("recorrente").checked) return null;
  
  const dataInput = document.getElementById("data").value;
  const tipo = document.getElementById("tipo-recorencia").value;
  
  // Corrige o fuso horário
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
  // Corrige o fuso horário
  const dataObj = new Date(dataString);
  const novaData = new Date(dataObj.getTime() + Math.abs(dataObj.getTimezoneOffset() * 60000));
  
  if (tipo === "semanal") {
    novaData.setDate(novaData.getDate() + 7);
  } else if (tipo === "mensal") {
    novaData.setMonth(novaData.getMonth() + 1);
  }
  
  return novaData.toISOString().split('T')[0];
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

  // Corrige o problema do fuso horário
  const dataObj = new Date(dataInput);
  const dataCorrigida = new Date(dataObj.getTime() + Math.abs(dataObj.getTimezoneOffset() * 60000));
  
  const transacao = {
    data: dataCorrigida.toISOString().split('T')[0], // Armazena como YYYY-MM-DD
    dataExibicao: dataCorrigida.toLocaleDateString('pt-BR'), // Exibe como DD/MM/YYYY
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
      // Mostrar apenas gastos não pagos OU receitas (que sempre são consideradas "recebidas")
      if ((!data.pago && data.tipo === 'gasto') || data.tipo === 'receita') {
        tabelaHTML += `
          <tr>
            <td>${data.dataExibicao}</td>
            <td>${data.descricao} ${data.recorrente ? '<span class="recorrente-badge">Recorrente</span>' : ''}</td>
            <td class="${data.tipo === 'receita' ? 'receita' : 'gasto'}">R$ ${formatarValor(data.valor)}</td>
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
      // Mostrar apenas gastos pagos (receitas não aparecem aqui)
      if (data.pago && data.tipo === 'gasto') {
        tabelaHTML += `
          <tr>
            <td>${data.dataExibicao}</td>
            <td>${data.descricao} ${data.recorrente ? '<span class="recorrente-badge">Recorrente</span>' : ''}</td>
            <td class="gasto">R$ ${formatarValor(data.valor)}</td>
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
      await deleteDoc(doc(db, "Transacoes", id));
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

// ==================== FUNÇÕES DE EXPORTAÇÃO ====================

async function exportarParaPDF() {
  try {
    const mes = document.getElementById("filtro-mes").value;
    const ano = document.getElementById("filtro-ano").value;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text(`Relatório Financeiro - Dupla Financeira`, 14, 15);
    doc.text(`Período: ${mes ? `${mes}/` : ''}${ano || 'Todos'}`, 14, 25);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 35);
    
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
          data.tipo === 'receita' ? 'Recebido' : (data.pago ? 'Sim' : 'Não'),
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
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 63, 32] }
    });
    
    doc.save(`relatorio-financeiro-${mes || ''}${ano || ''}.pdf`);
    mostrarPopup("✅ PDF gerado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    mostrarPopup("❌ Erro ao gerar PDF!", "#f44336");
  }
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
        csv += `"${data.dataExibicao}","${data.descricao}",${data.valor},"${data.categoria}","${data.responsavel}","${data.tipo === 'receita' ? 'Recebido' : (data.pago ? 'Sim' : 'Não')}","${data.recorrente ? (data.tipoRecorrencia === "semanal" ? "Semanal" : "Mensal") : 'Não'}"\n`;
      }
    });
    
    if (!temDados) {
      mostrarPopup("❌ Nenhuma transação no período selecionado!", "#f44336");
      return;
    }
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes-${mes || ''}${ano || ''}.csv`;
    link.click();
    mostrarPopup("✅ Excel gerado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar Excel:", error);
    mostrarPopup("❌ Erro ao gerar Excel!", "#f44336");
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

// ==================== FUNÇÕES DE RESUMO ====================

async function carregarResumoMensal(mes = null, ano = null) {
  try {
    const querySnapshot = await getDocs(collection(db, "Transacoes"));
    let totalReceitas = 0;
    let totalGastos = 0;
    let totalReceitasPendentes = 0;
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
          if (!transacao.pago) totalReceitasPendentes += transacao.valor;
        }
        if (transacao.tipo === "gasto") {
          totalGastos += transacao.valor;
          if (!transacao.pago) totalGastosPendentes += transacao.valor;
        }
      }
    });

    const saldo = totalReceitas - totalGastos;
    document.getElementById("resumo-mensal").innerHTML = `
      <div class="resumo-card"><h3>Receitas:</h3><p>R$ ${formatarValor(totalReceitas)}</p>
      <small>Pendentes: R$ ${formatarValor(totalReceitasPendentes)}</small></div>
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

async function adicionarMeta() {
  const nome = document.getElementById("meta-nome").value.trim();
  const valor = parseFloat(document.getElementById("meta-valor").value);
  
  if (!nome || isNaN(valor)) {
    mostrarPopup("❌ Preencha todos os campos corretamente!", "#f44336");
    return;
  }

  try {
    await addDoc(collection(db, "Metas"), { 
      nome, 
      valor, 
      progresso: 0
    });
    document.getElementById("meta-nome").value = "";
    document.getElementById("meta-valor").value = "";
    carregarMetas();
    mostrarPopup("✅ Meta adicionada!");
  } catch (error) {
    console.error("Erro ao adicionar meta:", error);
    mostrarPopup("❌ Erro ao adicionar meta!", "#f44336");
  }
}

async function carregarMetas() {
  try {
    const querySnapshot = await getDocs(collection(db, "Metas"));
    let html = "";
    querySnapshot.forEach(docItem => {
      const meta = docItem.data();
      const porcentagem = Math.min(100, (meta.progresso / meta.valor) * 100).toFixed(1);
      html += `
        <div class="meta-card">
          <h3>${meta.nome}</h3>
          <p>R$ ${formatarValor(meta.progresso)} / R$ ${formatarValor(meta.valor)}</p>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${porcentagem}%">${porcentagem}%</div>
          </div>
          <button onclick="window.excluirMeta('${docItem.id}')">🗑️ Excluir Meta</button>
        </div>
      `;
    });
    document.getElementById("lista-metas").innerHTML = html || "<p>Nenhuma meta cadastrada</p>";
  } catch (error) {
    console.error("Erro ao carregar metas:", error);
    mostrarPopup("❌ Erro ao carregar metas!", "#f44336");
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

// ==================== INICIALIZAÇÃO ====================

async function inicializar() {
  // Configura eventos
  document.getElementById("tipo-transacao").addEventListener("change", carregarCategorias);
  document.getElementById("salvar-transacao").addEventListener("click", adicionarTransacao);
  document.getElementById("exportar-pdf").addEventListener("click", exportarParaPDF);
  document.getElementById("exportar-excel").addEventListener("click", exportarParaExcel);
  document.getElementById("tipo-categoria").addEventListener("change", carregarCategoriasGerenciar);
  document.getElementById("adicionar-categoria").addEventListener("click", adicionarCategoria);
  document.getElementById("remover-categoria").addEventListener("click", removerCategoria);
  document.getElementById("adicionar-meta").addEventListener("click", adicionarMeta);

  // Formatação automática do valor monetário
  document.getElementById("valor").addEventListener('blur', function() {
    if (this.value) {
      let value = this.value.replace(/\D/g, '');
      value = (value/100).toFixed(2).replace('.', ',');
      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      this.value = value;
    }
  });

  // Define data atual como padrão
  document.getElementById("data").valueAsDate = new Date();

  // Carrega dados iniciais
  await carregarCategorias();
  await carregarTransacoes();
  await carregarTransacoesPagas();
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

// Inicializa o app quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', inicializar);