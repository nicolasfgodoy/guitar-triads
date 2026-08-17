document.addEventListener('DOMContentLoaded', () => {
  const toggleSidebar = document.getElementById('toggle-sidebar');
  const toggleSound = document.getElementById('toggle-sound');
  const openAppBtn = document.getElementById('open-app');

  // Carrega configurações salvas
  chrome.storage?.local?.get(['showSidebar', 'playSound'], (result) => {
    if (result.showSidebar !== undefined) toggleSidebar.checked = result.showSidebar;
    if (result.playSound !== undefined) toggleSound.checked = result.playSound;
  });

  // Salva e envia eventos para a aba ativa
  function updateConfig() {
    const config = {
      showSidebar: toggleSidebar.checked,
      playSound: toggleSound.checked
    };
    chrome.storage?.local?.set(config);

    // Envia mensagem para a aba ativa para aplicar as mudanças em tempo real
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateConfig', config }).catch(() => {
          // Ignora se o script do content.js não estiver carregado na aba
        });
      }
    });
  }

  toggleSidebar.addEventListener('change', updateConfig);
  toggleSound.addEventListener('change', updateConfig);

  openAppBtn.addEventListener('click', () => {
    window.open('https://guitar-triads.netlify.app', '_blank');
  });
});
