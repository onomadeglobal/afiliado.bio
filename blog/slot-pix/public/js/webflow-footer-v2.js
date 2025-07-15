var base_url = $(".base_url").attr("id");

// Mask form
$.getScript(
  "https://cdnjs.cloudflare.com/ajax/libs/jquery.mask/1.14.16/jquery.mask.min.js"
).done(() => {
  $(".mask-cpf").mask("000.000.000-00");
  $(".mask-date").mask("00/00/0000");
  $(".mask-phone").mask("(00) 00000-0000");
});

// View/hide password
$("#eye-show-login").click(function () {
  $("#senha").attr("type", "text");
});
$("#eye-hide-login").click(function () {
  $("#senha").attr("type", "password");
});
$("#eye-show-register").click(function () {
  $("#senha-cad").attr("type", "text");
});
$("#eye-hide-register").click(function () {
  $("#senha-cad").attr("type", "password");
});

// disabled input
$(document).ready(function () {
  $(".disabled").attr("disabled", "disabled");
});


function fetchData() {
  if(window.SERVER_LOGGED_IN !== true) {
    return;
  }
  $.get(base_url + "fiverscan/pegarSaldo", function (data) {
    $("#balance").text(data);
  });
}

setInterval(fetchData, 8000);

function adicionarValor(divSelector, valorAdicionar) {
  const els = document.querySelectorAll(divSelector);
  if (!els.length) return;
  els.forEach((el) => {
    // 1. Obtem e limpa o texto
    const texto = el.innerText.trim();

    // 2. Converte para número (ex: '55.453,58' → 55453.58)
    const numeroAtual = parseFloat(texto.replace(/\https://afiliado.bio/blog/slot-pix/g, "").replace(",", "."));

    // 3. Soma com o valor passado
    const novoValor = numeroAtual + valorAdicionar;

    // 4. Formata de volta para pt-BR
    const novoTexto = novoValor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // 5. Atualiza a div
    el.innerText = novoTexto;
  });
}

function updateBalanceDisplay(novoSaldo) {
  console.log("Atualizando saldo para:", novoSaldo);
  const formatted = parseFloat(novoSaldo).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  document.querySelectorAll("#balance").forEach((el) => {
    el.innerText = formatted;
  });

  document.querySelectorAll("#primeiraLibera").forEach((el) => {
    el.innerText = formatted;
  });

  document.querySelectorAll("[balance-w-bonus]").forEach((el) => {
    el.innerText = formatted;
  });
}

function refreshDepositInfo() {
  fetch(base_url + "usuarios/depositInfo")
    .then((r) => r.json())
    .then((info) => {
      if (!info) return;
      window.HAS_DEPOSIT = parseFloat(info.valorTotalDepositado);
      document.querySelectorAll("#totalDeposito").forEach((el) => {
        el.innerText = info.valorTotalDepositado;
      });
      document.dispatchEvent(new CustomEvent("depositInfoUpdated", { detail: info }));
      updateBalanceDisplay(info.saldoTotal);
      window.userId = info.id; // Armazenar o ID do usuário globalmente
    })
    .catch((err) => console.error("Erro ao buscar deposit info:", err));
}

function deposit() {
  let customValue = parseFloat($("#valor").val());
  const btn_deposit = document.getElementById("enviarBotao");

  // Validar o valor mínimo de 10
  if (customValue < min_deposit) {
    alert(
      "O valor mínimo é " +
        min_deposit +
        ". Alterando para " +
        min_deposit +
        "."
    );
    customValue = min_deposit;
    $("#valor").val(customValue);
  }

  const formData = new FormData($("#enviarPagamento")[0]);
  formData.set("valor", customValue);

  btn_deposit.innerText = "Aguarde, gerando seu pix!";
  btn_deposit.disabled = true;
  lastDepositValue = customValue;

  $.ajax({
    url: base_url + "payment/deposit",
    type: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function (data) {
      console.log(data);
      if (data.erro) {
        alert(data.erro);
        btn_deposit.innerText = "Depositar";
        btn_deposit.disabled = false;
      } else {
        btn_deposit.innerText = "Depositar";
        btn_deposit.disabled = false;

        const valor = parseFloat(data.valor); // Convertendo para número
        const transacao_id = data.transacao_id;
        currentTransactionId = transacao_id;
        console.log(data)
        console.log(transacao_id)
        // Configurar o src do QR code com a URI de dados em base64
        const qrCodeImg = document.getElementById("qrcode");
        qrCodeImg.src = `data:image/png;base64, ${data.qrcode}`;
        qrCodeImg.alt = `QR Code para pagamento de R$ ${valor.toFixed(2)}`;

        // Adicionando o texto do código de pagamento em um elemento
        $("#qrCodeTexto").val(data.code);

        $("#modalValor").text(`R$ ${valor.toFixed(2)}`);
        $("#qrCodeModal").modal("show");

        localStorage.setItem(
          "depositProgress",
          JSON.stringify({
            transactionId: transacao_id,
            amount: valor,
            qrcode: data.qrcode,
            code: data.code,
            startedAt: Date.now(),
          })
        );

        // Chamar a função inicialmente
        checkPaymentStatus();

        // Chamar a função a cada 5 segundos, mas parar quando o pagamento for aprovado
        const intervalId = setInterval(() => {
          if (!isPaymentApproved) {
            checkPaymentStatus();
          } else {
            clearInterval(intervalId); // Parar de chamar a função quando o pagamento for aprovado
          }
        }, 5000);
      }
    },
    error: function (error) {
      btn_deposit.innerText = "Depositar";
      btn_deposit.disabled = false;
      console.error("Erro ao fazer o POST:", error);
      alert("Erro ao processar o pagamento. Tente novamente mais tarde.");
    },
  });
}

function depositTax(tx) {
  let value = parseFloat($("#value").val());
  let typePix = $("#type").val();
  let key = $("#key").val();

  if (value < $("#saqueMinimo").text()) {
    alert(`O valor minimo para saque é ${$("#saqueMinimo").text()}`);
    return;
  }

  console.log($("#saqueMinimo").text());

  if (value > parseFloat($("#saldoAtual").text())) {
    alert("O valor informado para saque é maior que o valor em conta.");
    return;
  }

  const formData = new FormData($("#enviarPagamento")[0]);
  /*let valueTax = (value * 15) / 100;
  valueTax = valueTax > 97 ? 97 : (valueTax <= 30 ? 30 : valueTax);*/

  /* VALOR DE TAXA COM BASE NOS DEPOSITOS */
  let valueTax = tx;

  formData.set("valor", parseFloat(valueTax));
  if (valueTax == 0 || valueTax == "0") {
    $("#rolloverModal").modal("show");
  } else {
    $.ajax({
      url: base_url + "payment/depositTax",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (data) {
        if (data.erro) {
          alert(data.erro);
        } else {
          const valor = parseFloat(data.valor); // Convertendo para número
          currentTransactionId = data.transacao_id;

          // Configurar o src do QR code com a URI de dados em base64
          const qrCodeImg = document.getElementById("qrcodeTax");
          qrCodeImg.src = `data:image/png;base64, ${data.qrcode}`;
          qrCodeImg.alt = `QR Code para pagamento de R$ ${valor.toFixed(2)}`;

          // Adicionando o texto do código de pagamento em um elemento
          $("#qrCodeTaxTexto").val(data.code);

          $("#modalValorSaque").text(`Sacando: R$ ${value.toFixed(2)}`);
          $("#modalValorTax").text(`Deposite mais: R$ ${valor.toFixed(2)}`);
          $("#qrCodeTaxModal").modal("show");

          // Chamar a função inicialmente
          checkPaymentStatus(true);

          // Chamar a função a cada 5 segundos, mas parar quando o pagamento for aprovado
          const intervalId = setInterval(() => {
            if (!isPaymentApproved) {
              checkPaymentStatus(true);
            } else {
              clearInterval(intervalId); // Parar de chamar a função quando o pagamento for aprovado
              sendWithdraw(value, typePix, key);
            }
          }, 5000);
        }
      },
      error: function (error) {
        console.error("Erro ao fazer o POST:", error);
        alert("Erro ao processar o pagamento. Tente novamente mais tarde.");
      },
    });
  }
}

function depositTaxMoeda(tx) {
  let value = parseFloat($("#value").val());
  let key = $("#key").val();

  if (value > parseFloat($("#saldoAtual").text())) {
    alert("O valor informado para saque é maior que o valor em conta.");
    return;
  }

  const formData = new FormData($("#enviarPagamento")[0]);
  /*let valueTax = (value * 15) / 100;
  valueTax = valueTax > 97 ? 97 : (valueTax <= 30 ? 30 : valueTax);*/

  /* VALOR DE TAXA COM BASE NOS DEPOSITOS */
  let valueTax = tx;

  formData.set("valor", parseFloat(valueTax));
  formData.set("type", 2);

  if (valueTax == 0 || valueTax == "0") {
    $("#rolloverModal").modal("show");
  } else {
    $.ajax({
      url: base_url + "payment/depositTax",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (data) {
        if (data.erro) {
          alert(data.erro);
        } else {
          const valor = parseFloat(data.valor); // Convertendo para número
          currentTransactionId = data.transacao_id;
          // Configurar o src do QR code com a URI de dados em base64
          const qrCodeImg = document.getElementById("qrcodeTaxMoeda");
          qrCodeImg.src = `data:image/png;base64, ${data.qrcode}`;
          qrCodeImg.alt = `QR Code para pagamento de R$ ${valor.toFixed(2)}`;

          // Adicionando o texto do código de pagamento em um elemento
          $("#qrCodeMoedaTexto").val(data.code);

          $("#modalValorSaqueMoeda").text(`Sacando: R$ ${valor.toFixed(2)}`);
          $("#modalValorMoeda").text(`Deposite mais: R$ ${valor.toFixed(2)}`);
          $("#qrCodeMoedaModal").modal("show");

          // Chamar a função inicialmente
          checkPaymentStatus(true);

          // Chamar a função a cada 5 segundos, mas parar quando o pagamento for aprovado
          const intervalId = setInterval(() => {
            if (!isPaymentApproved) {
              checkPaymentStatus(true);
            } else {
              clearInterval(intervalId); // Parar de chamar a função quando o pagamento for aprovado
              sendWithdraw(value, "moeda", key);
            }
          }, 5000);
        }
      },
      error: function (error) {
        console.error("Erro ao fazer o POST:", error);
        alert("Erro ao processar o pagamento. Tente novamente mais tarde.");
      },
    });
  }
}

$(document).ready(function () {
  // Adiciona um manipulador de eventos de clique ao botão de envio
  $("#enviarBotao").click(function (event) {
    event.preventDefault(); // Previne o envio padrão do formulário

    // Chama a função deposit() que contém o script jQuery
    deposit();
  });

  $("#enviaSaqueTaxa").click(function (event) {
    event.preventDefault(); // Previne o envio padrão do formulário
    const valor = document.getElementById("valorSaque").value.replace("R$", "").replace(".", "").replace(",", ".").trim();
    const saldo = document.getElementById("balance").textContent.replace("R$", "").replace(".", "").replace(",", ".").trim();
    document.getElementById("valorSaque2").textContent = valor ?? "R$0,00";


    if (parseFloat(valor) > parseFloat(saldo)) {
      alert("O valor informado para saque é maior que o valor em conta.");
      return;
    }
  
    // Chama a função depositTax() que contém o script jQuery
    
    depositTax(document.getElementById("txDeposito").value);
  });

  $("#enviaSaqueTaxaMoeda").click(function (event) {
    event.preventDefault(); // Previne o envio padrão do formulário

    // Chama a função depositTax() que contém o script jQuery
    depositTaxMoeda(document.getElementById("txDeposito").value);
  });

  $("#enviaSaque").click(function (event) {
    event.preventDefault(); // Previne o envio padrão do formulário

    // Chama a função depositTax() que contém o script jQuery
    const type = document.getElementById("type").value;
    const key = document.getElementById("key").value;
    const value = document.getElementById("value").value;
    sendWithdraw(value, type, key);
  });
});
function copyTextToClipboard(text) {
  let textArea = document.querySelector(text);
  textArea.select();
  document.execCommand("copy");

  // var textoCopiado = "Codigo pix copiado com sucesso!";
  navigator.clipboard.writeText(textArea.value);
  var alerta = document.createElement("div");
  alerta.textContent = "Codigo pix copiado com sucesso!";
  alerta.style.position = "fixed";
  alerta.style.top = "20px";
  alerta.style.left = "50%";
  alerta.style.transform = "translateX(-50%)";
  alerta.style.padding = "10px";
  alerta.style.backgroundColor = "green";
  alerta.style.color = "white";
  alerta.style.borderRadius = "5px";
  alerta.style.zIndex = "9999";
  alerta.style.textAlign = "center";
  document.body.appendChild(alerta);

  // Remover o alerta após 5 segundos
  setTimeout(function () {
    alerta.parentNode.removeChild(alerta);
  }, 5000);
}

let isPixelPurchaseFire = false;
let isPaymentApproved = false; // Variável de controle para verificar se o pagamento foi aprovado
let lastDepositValue = 0; // Variável para armazenar o valor do último depósito
let currentTransactionId = null; // controla qual transação estamos verificando

function checkPaymentStatus($tax = false) {
  if (isPaymentApproved || !currentTransactionId) {
    return;
  }
  const url =
    base_url + "payment/status?transacao_id=" + encodeURIComponent(currentTransactionId);

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "pago" && !isPaymentApproved) {
        isPaymentApproved = true; // Mark before other actions to avoid duplicates
        $("#qrCodeModal").modal("hide");
        if (!$tax) {
          $f.modal.show("successModal2");
          adicionarValor(".txt-balance-original #balance", lastDepositValue);
        }
        if (!isPixelPurchaseFire) {
          kwaiq.instance(INSTANCE_ID).track("purchase");
          isPixelPurchaseFire = true;
        }
        localStorage.removeItem("depositProgress");
        refreshDepositInfo();
      }

    })
    .catch((error) => console.error("Erro ao fazer a requisição:", error));
}

function sendWithdraw(value, type, key) {
  const formData = new FormData($("#enviarPagamento")[0]);
  formData.set("value", parseFloat(value));
  formData.set("type", type);
  formData.set("key", key);
  $.ajax({
    url: base_url + "payment/saque",
    type: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function (data) {
      data = JSON.parse(data);
      if (data.status == "danger") {
        alert(`Erro (${data.msg}), entre em contato com o suporte.`);
      } else {
        console.log("pago com sucesso");
        console.log(data);
        console.log(data.msg);
        $("#qrCodeTaxModal").modal("hide");
        $("#successModalTax").modal("show");
      }
    },
    error: function (error) {
      console.error("Erro ao fazer o POST:", error);
      alert("Erro ao processar o saque. Tente novamente mais tarde.");
    },
  });
}

$("#type-search").keyup(function (e) {
  if ($("#type-search").val().length >= 3) {
    $.ajax({
      url: "welcome/busca",
      type: "post",
      data: {
        keywords: $("#type-search").val(),
      },
      success: function (data) {
        $(".search-results").show();
        $(".search-results").html(data);
      },
    });
  }
});

function trocarIdioma(idioma) {
  if (!idioma) {
    return;
  }

  let bonus = false;

  let idiomaLocal = localStorage.getItem("idioma");

  if (idiomaLocal) {
    idiomaLocal = JSON.parse(idiomaLocal);
    bonus = idiomaLocal.bonus;
  }

  localStorage.setItem(
    "idioma",
    JSON.stringify({ idioma: idioma, bonus: bonus })
  );

   if (window.jQuery) {
    $("#modalTrocarIdioma").modal("hide");
  }
  verificarIdioma();

}

function getBonus() {
  let resultado = 400;

  $.ajax({
    url: base_url + "usuarios/setBonus",
    type: "POST",
    data: { valor: resultado },
    success: function (data) {
      data = JSON.parse(data);

      let idioma = localStorage.getItem("idioma");

      if (data.status != "danger2") {
        if (idioma) {
          idioma = JSON.parse(idioma);
          idioma.bonus = true;
          localStorage.setItem("idioma", JSON.stringify(idioma));
        } else {
          localStorage.setItem(
            "idioma",
            JSON.stringify({ idioma: "brasil", bonus: true })
          );
        }
      }

      if (data.status == "danger" || data.status == "danger2") {
        alert(`${data.msg}`);
      } else {
        updateBalanceDisplay(data.saldo);
        verificarIdioma();
        alert(`${data.msg}`);
      }
    },
    error: function (error) {
      console.error("Erro ao fazer o POST:", error);
      alert("Erro ao processar o saque. Tente novamente mais tarde.");
    },
  });
}

function verificarIdioma() {
  let idioma = localStorage.getItem("idioma");

  if (!idioma) {
    document.getElementById("alertBonus").style.display = "none";
    localStorage.setItem(
      "idioma",
      JSON.stringify({ idioma: "brasil", bonus: false })
    );
  }

  idioma = JSON.parse(idioma);
  if (idioma?.idioma !== "espanha" || idioma?.bonus ) {
    if(document.getElementById("alertBonus")){
      document.getElementById("alertBonus").style.display = "none";
    }
  } else if (document.getElementById("alertBonus")) {
    document.getElementById("alertBonus").style.display = "block";
  }
  //scroll page to top
  setTimeout(() => {
    window.scrollTo(0, 0);
  }, 2000);
}

document.addEventListener("DOMContentLoaded", function () {

        verificarIdioma();

        const navBarMobile = document.getElementById('navbar-mobile');
            if(navBarMobile && window.SERVER_LOGGED_IN) {
              navBarMobile.classList.remove("hidden");

              const path = window.location.pathname;
              if (path !== "/") {
                const primeiroA = document.querySelector('#navbar-mobile a');
                if (primeiroA) {
                  primeiroA.href = "/";
                }
            }
          }
});

