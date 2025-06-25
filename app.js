import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, getDoc,
  arrayUnion, arrayRemove, query, orderBy, setDoc, deleteDoc
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

// Função: troca de abas melhorada
function abrirAba(abaId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isSelected = btn.getAttribute('aria-controls') === abaId;
    btn.setAttribute('aria-selected', isSelected);
    btn.classList.toggle('active', isSelected);
  });
  
  document.querySelectorAll('.tab-content').forEach(aba => {
    aba.classList.toggle('active', aba.id === abaId);
  });

  document.getElementById(abaId).scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (abaId === 'graficos') carregarGraficos();
  if (abaId === 'resumo') {
    carregarResumoMensal();
    carregarMetas();
    carregarAlertas();
  }
  if (abaId === 'categorias') carregarCategoriasGerenciar();
}
window.abrirAba = abrirAba;

// Popup visual
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
  popup.style.transition = 'opacity 0.5s';
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => document.body.removeChild(popup), 500);
  }, 2000);
}

// Carregar categorias para Finanças
async function carregarCategorias() {
  const tipo = document.getElementById("tipo-transacao").value;
  const docRef = doc(db, "Categorias", `${tipo}_categorias`);
  try {
    const docSnap = await getDoc(docRef);
    const select = document.getElementById("categoria");
    if (docSnap.exists()) {
      select.innerHTML = docSnap.data().itens.map(item => `<option value="${item}">${item}</option>`).join("");
    } else {
      select.innerHTML = "<option>Nenhuma categoria</option>";
    }
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
  }
}

// Carregar categorias para a aba de Gerenciar Categorias
async function carregarCategoriasGerenciar() {
  const tipo = document.getElementById("tipo-categoria").value;
  const docRef = doc(db, "Categorias", `${tipo}_categorias`);
  try {
    const docSnap = await getDoc(docRef);
    const select = document.getElementById("categoria-existente");
    if (docSnap.exists()) {
      select.innerHTML = docSnap.data().itens.map(item => `<option value="${item}">${item}</option>`).join("");
    } else {
      select.innerHTML = "<option>Nenhuma categoria</option>";
    }
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
  }
}
window.carregarCategoriasGerenciar = carregarCategoriasGerenciar;

// Adicionar transação
async function adicionarTransacao() {
  const tipo = document.getElementById("tipo-transacao").value;
  const dataInput = document.getElementById("data").value;
  const dataFormatada = new Date(dataInput).toLocaleDateString('pt-BR');
  
  const transacao = {
    data: dataFormatada,
    descricao: document.getElementById("descricao").value,
    valor: parseFloat(document.getElementById("valor").value),
    categoria: document.getElementById("categoria").value,
    responsavel: document.getElementById("responsavel").value,
    tipo: tipo
  };

  try {
    await addDoc(collection(db, "Transacoes"), transacao);
    mostrarPopup("✅ Transação salva!");
    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";
    carregarTransacoes();
  } catch (error) {
    console.error("Erro ao salvar transação:", error);
    mostrarPopup("❌ Erro ao salvar!", "#f44336");
  }
}
window.adicionarTransacao = adicionarTransacao;

// Carregar transações
async function carregarTransacoes() {
  try {
    const q = query(collection(db, "Transacoes"), orderBy("data", "desc"));
    const querySnapshot = await getDocs(q);
    let tabelaHTML = "";
    querySnapshot.forEach((docItem) => {
      const data = docItem.data();
      tabelaHTML += `
        <tr>
          <td>${data.data}</td>
          <td>${data.descricao}</td>
          <td class="${data.tipo === 'receita' ? 'receita' : 'gasto'}">R$ ${data.valor.toFixed(2)}</td>
          <td>${data.categoria}</td>
          <td>${data.responsavel}</td>
          <td><button class="delete-btn" onclick="removerTransacao('${docItem.id}')">🗑️</button></td>
        </tr>
      `;
    });
    document.getElementById("corpo-tabela").innerHTML = tabelaHTML;
  } catch (error) {
    console.error("Erro ao carregar transações:", error);
  }
}

// Remover transação
async function removerTransacao(id) {
  try {
    await deleteDoc(doc(db, "Transacoes", id));
    mostrarPopup("✅ Transação excluída!", "#f44336");
    carregarTransacoes();
  } catch (error) {
    console.error("Erro ao excluir transação:", error);
    mostrarPopup("❌ Erro ao excluir!", "#f44336");
  }
}
window.removerTransacao = removerTransacao;

// Carregar gráficos
async function carregarGraficos() {
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
}

// Adicionar categoria
async function adicionarCategoria() {
  const tipo = document.getElementById("tipo-categoria").value;
  const novaCategoria = document.getElementById("nova-categoria").value.trim();
  if (!novaCategoria) return;

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
    mostrarPopup("❌ Erro ao adicionar!", "#f44336");
  }
}
window.adicionarCategoria = adicionarCategoria;

// Remover categoria
async function removerCategoria() {
  const tipo = document.getElementById("tipo-categoria").value;
  const categoria = document.getElementById("categoria-existente").value;
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
    mostrarPopup("❌ Erro ao remover!", "#f44336");
  }
}
window.removerCategoria = removerCategoria;

// Adicionar meta
async function adicionarMeta() {
  const nome = document.getElementById("meta-nome").value.trim();
  const valor = parseFloat(document.getElementById("meta-valor").value);
  if (!nome || isNaN(valor)) return;

  await addDoc(collection(db, "Metas"), { 
    nome, 
    valor, 
    progresso: 0
  });
  document.getElementById("meta-nome").value = "";
  document.getElementById("meta-valor").value = "";
  carregarMetas();
  mostrarPopup("✅ Meta adicionada!");
}
window.adicionarMeta = adicionarMeta;

// Carregar metas
async function carregarMetas() {
  const querySnapshot = await getDocs(collection(db, "Metas"));
  let html = "";
  querySnapshot.forEach(docItem => {
    const meta = docItem.data();
    const porcentagem = Math.min(100, (meta.progresso / meta.valor) * 100).toFixed(1);
    html += `
      <div class="meta-card">
        <h3>${meta.nome}</h3>
        <p>R$ ${meta.progresso} / R$ ${meta.valor}</p>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width:${porcentagem}%">${porcentagem}%</div>
        </div>
        <button onclick="excluirMeta('${docItem.id}')">🗑️ Excluir Meta</button>
      </div>
    `;
  });
  document.getElementById("lista-metas").innerHTML = html;
}

// Excluir meta
async function excluirMeta(id) {
  await deleteDoc(doc(db, "Metas", id));
  carregarMetas();
  mostrarPopup("✅ Meta excluída!", "#f44336");
}
window.excluirMeta = excluirMeta;

// Resumo mensal
async function carregarResumoMensal() {
  const querySnapshot = await getDocs(collection(db, "Transacoes"));
  let totalReceitas = 0;
  let totalGastos = 0;

  querySnapshot.forEach(docItem => {
    const transacao = docItem.data();
    if (transacao.tipo === "receita") totalReceitas += transacao.valor;
    if (transacao.tipo === "gasto") totalGastos += transacao.valor;
  });

  const saldo = totalReceitas - totalGastos;
  document.getElementById("resumo-mensal").innerHTML = `
    <div class="resumo-card"><h3>Receitas:</h3><p>R$ ${totalReceitas.toFixed(2)}</p></div>
    <div class="resumo-card"><h3>Gastos:</h3><p>R$ ${totalGastos.toFixed(2)}</p></div>
    <div class="resumo-card"><h3>Saldo:</h3><p>R$ ${saldo.toFixed(2)}</p></div>
  `;
}

// Alertas de gastos
async function carregarAlertas() {
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
      alertas += `<div class="alerta-card"><h3>⚠️ Excesso em ${categoria}</h3><p>Gastos: R$ ${gastosPorCategoria[categoria].toFixed(2)}</p></div>`;
    }
  }

  if (!alertas) alertas = "<p>Sem alertas por enquanto.</p>";
  document.getElementById("alertas").innerHTML = alertas;
}

// Ao carregar a página
window.onload = async () => {
  document.getElementById("tipo-transacao").addEventListener("change", carregarCategorias);
  document.getElementById("data").valueAsDate = new Date(); // Define a data atual como padrão
  
  // Carrega os dados iniciais
  await carregarCategorias();
  await carregarTransacoes();
  abrirAba('financeiro');
};