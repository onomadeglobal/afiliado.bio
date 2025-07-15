$(function(){
  function handleAuthForm(formSelector, modalId, fireComplete){
    $(document).on('submit', formSelector, function(e){
      e.preventDefault();
      var $form = $(this);
      var $btn = $form.find('[type="submit"]');
      var original = $btn.html();
      $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Carregando');
      $.ajax({
        url: $form.attr('action'),
        method: 'POST',
        data: $form.serialize(),
        dataType: 'json',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        success: function(resp){
          if(resp.status === 'success'){
            console.log(resp);
            /*
            <div class="mt-3 mb-3 col-md-12">
              <div class="alert alert-resp.tipo font alert-dismissible fade show" role="alert">
                resp.msg
              </div>
            </div>
            */
            // const contentRegistration = document.getElementById('registrationContent');

            // // 1) Cria o container do alerta
            // const alertWrapper = document.createElement('div');
            // alertWrapper.classList.add('mt-3', 'mb-3', 'col-md-12');

            // // 2) Preenche com o HTML do alerta
            // alertWrapper.innerHTML = `
            //   <div class="alert alert-${resp.status} font alert-dismissible fade show" role="alert" id="alertGlobal">
            //     ${resp.msg}
            //   </div>
            // `;

            // // 3) Insere no topo de contentRegistration
            // contentRegistration.prepend(alertWrapper);

            // 4) (Opcional) Remove após X segundos
            // setTimeout(() => {
            //   alertWrapper.remove();
            // }, 5000);  // por exemplo 5s
            updateHeader(resp);
            window.userId = resp.id || window.userId;
            localStorage.setItem('userId', window.userId);
            if(fireComplete && typeof kwaiq !== 'undefined'){
              kwaiq.instance(INSTANCE_ID).track('completeRegistration');
            }
            if(modalId){ $f.modal.hide(modalId); }
            window.SERVER_LOGGED_IN = true;
            const navBarMobile = document.getElementById('navbar-mobile');
            if(navBarMobile){
              navBarMobile.classList.remove("hidden");
            }
          }else{
            alert(resp.msg || 'Erro ao processar');
          }

          $btn.prop('disabled', false).html(original);
        },
        error: function(){
          alert('Erro ao processar');
          $btn.prop('disabled', false).html(original);
        }
      });
    });
  }

  function buildLoggedHtml(data){
    var saldo = parseFloat(data.saldo).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    var base = $('.base_url').attr('id') || '/';
    return '<div class="navbar-logged" style="display:block;">\n' +
      '  <div class="navbar-buttons-balance-wrapper">\n' +
      '    <a href="#" class="btn-small btn-color-1 w-button"  id="depositBtnAuth"  data-deposit-btn data-toggle="modal" style="position: relative;"><span class="icon-20 no-mobile">+</span>\n' +
      '      <p class="pix-upper"><img class="logo-pix" src="/public/images/logo-pix.png" />PIX</p><span>Depositar</span></a>\n' +
      '    <div data-hover="true" data-delay="0" class="w-dropdown">\n' +
      '      <div class="balance-info w-dropdown-toggle" aria-haspopup="menu" aria-expanded="false">\n' +
      '        <div class="gray txt-label">Banca</div>\n' +
      '        <div class="txt-balance-original">\n' +
      '          <div class="flex-horizontal white"><h4 class="mr-8 green">R$</h4><h4 id="balance">'+saldo+'</h4></div>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </div>\n' +
      '    <div class="dropdown">\n' +
      '      <button class="btn btn-secondary dropdown-toggle" id="dropdownOpts" type="button" data-toggle="dropdown" aria-expanded="false">\n' +
      '        <div class="eng-letter-name no-mobile"><div class="letter-name"></div></div>\n' +
      '      </button>\n' +
      '      <div class="dropdown-menu tailwindcss">\n' +
      '        <nav class="drop-list-menu !bg-[#272727] w-dropdown-list w--open caixa-minhaconta">\n' +
      '          <a href="'+base+'usuarios/minhaconta" class="eng-info-account w-inline-block">\n' +
      '            <div class="icon-16 fixed-width-24"></div>\n' +
      '            <div class="info-account"><div user-email="" class="txt-label no-wrap">'+data.email+'</div></div>\n' +
      '          </a>\n' +
      '          <a fs-scrolldisable-element="disable" href="#" class="link-drop w-inline-block" data-deposit-btn data-toggle="modal">\n' +
      '            <div class="icon-16 fixed-width-24"></div><div>Depositar</div>\n' +
      '          </a>\n' +
      '          <a fs-scrolldisable-element="disable" href="#" class="link-drop w-inline-block" data-toggle="modal" data-target="#modalSaque">\n' +
      '            <div class="icon-16 fixed-width-24"></div><div>Sacar</div>\n' +
      '          </a>\n' +
      '          <a fs-scrolldisable-element="disable" href="#" class="link-drop w-inline-block" data-toggle="modal" data-target="#modalTrocarIdioma">\n' +
      '            <div class="flex justify-start items-start icon-16 fixed-width-24"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A9C29" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe-icon lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg></div><div>Idioma</div>\n' +
      '          </a>\n' +
      '          <a id="logout-btn" href="'+base+'usuarios/logout" class="link-drop color-1 w-inline-block">\n' +
      '            <div class="icon-16 fixed-width-24"></div><div>Sair</div>\n' +
      '          </a>\n' +
      '        </nav>\n' +
      '      </div>\n' +
      '    </div>\n' +
      '  </div>\n' +
      '</div>';
  }

  function updateHeader(data){
    $('.navbar-buttons-login-wrapper').each(function(){
      $(this).replaceWith(buildLoggedHtml(data));
    });
    if(typeof updateBalanceDisplay === 'function'){
      updateBalanceDisplay(data.saldo);
    }

    // Remove "register to play" handler once the user is logged in
    $(document).off('click.auth', 'a.link-game');
    refreshDepositInfo();

  }


  handleAuthForm('#cadastroModal2 form','cadastroModal2', true);
  handleAuthForm('#entrarModal2 form','entrarModal2', false);

  $(document).on('click', '[data-deposit-btn]', function(e){
    e.preventDefault();
    if(window.$f && $f.modal){
      $f.modal.show('modalDeposito2');
    }
  });

});
