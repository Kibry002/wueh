document.addEventListener('DOMContentLoaded', function() {
  // Constants
  const MAX_BOTS = 10;
  
  // DOM elements
  const botFileInput = document.getElementById('botFile');
  const botImageInput = document.getElementById('botImage');
  const uploadBtn = document.getElementById('uploadBtn');
  const botContainer = document.getElementById('botContainer');
  const botFileName = document.getElementById('botFileName');
  const botImageName = document.getElementById('botImageName');
  const botFileLabel = document.getElementById('botFileLabel');
  const botImageLabel = document.getElementById('botImageLabel');
  const uploadCard = document.getElementById('uploadCard');
  
  // Show selected file names
  botFileInput.addEventListener('change', function() {
      if (this.files.length > 0) {
          botFileName.textContent = this.files[0].name;
      } else {
          botFileName.textContent = 'No file selected';
      }
  });
  
  botImageInput.addEventListener('change', function() {
      if (this.files.length > 0) {
          botImageName.textContent = this.files[0].name;
      } else {
          botImageName.textContent = 'No file selected';
      }
  });
  
  // Load bots when page loads
  loadBots();
  
  // Upload bot functionality
  uploadBtn.addEventListener('click', function() {
      const bots = JSON.parse(localStorage.getItem('bots')) || {};
      
      if (Object.keys(bots).length >= MAX_BOTS) {
          return;
      }
      
      const botFile = botFileInput.files[0];
      const imageFile = botImageInput.files[0];
      
      if (!botFile) {
          alert('Please select a bot XML file');
          return;
      }
      
      if (!imageFile) {
          alert('Please select a performance screenshot');
          return;
      }
      
      const botName = botFile.name.replace('.xml', '');
      
      if (botExists(botName)) {
          alert(`A bot with the name "${botName}" already exists. Please delete it first or rename your file.`);
          return;
      }
      
      const botReader = new FileReader();
      botReader.onload = function(e) {
          const botContent = e.target.result;
          
          const imageReader = new FileReader();
          imageReader.onload = function(e) {
              const imageData = e.target.result;
              
              const saved = saveBot(botName, botContent, imageData);
              if (!saved) return;
              
              loadBots();
              
              botFileInput.value = '';
              botImageInput.value = '';
              botFileName.textContent = 'No file selected';
              botImageName.textContent = 'No file selected';
              
              alert('Bot uploaded successfully!');
          };
          imageReader.onloaderror = function() {
              alert('Error reading the image file. Please try again.');
          };
          imageReader.readAsDataURL(imageFile);
      };
      botReader.onerror = function() {
          alert('Error reading the bot file. Please try again.');
      };
      botReader.readAsText(botFile);
  });
  
  function botExists(name) {
      const bots = JSON.parse(localStorage.getItem('bots')) || {};
      return bots.hasOwnProperty(name);
  }
  
  function saveBot(name, xmlContent, imageData) {
      let bots = JSON.parse(localStorage.getItem('bots')) || {};
      
      if (Object.keys(bots).length >= MAX_BOTS) {
          return false;
      }
      
      bots[name] = {
          xml: xmlContent,
          image: imageData,
          timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('bots', JSON.stringify(bots));
      updateBotCount();
      return true;
  }
  
  function loadBots() {
      botContainer.innerHTML = '';
      const bots = JSON.parse(localStorage.getItem('bots')) || {};
      const botCount = Object.keys(bots).length;
      
      // Show/hide upload card based on bot count
      if (botCount >= MAX_BOTS) {
          uploadCard.classList.add('hidden');
      } else {
          uploadCard.classList.remove('hidden');
      }
      
      if (botCount === 0) {
          botContainer.innerHTML = `
              <div class="empty-state">
                  <i class="fas fa-robot"></i>
                  <h3>No Bots Uploaded Yet</h3>
                  <p>Upload your first trading bot to get started</p>
              </div>
          `;
          return;
      }
      
      for (const [name, botData] of Object.entries(bots)) {
          const botCard = document.createElement('div');
          botCard.className = 'bot-card';
          
          botCard.innerHTML = `
              <img src="${botData.image}" alt="${name} Performance" class="bot-image">
              <div class="bot-content">
                  <h3 class="bot-name">${name}</h3>
                  <p class="bot-date">Uploaded: ${new Date(botData.timestamp).toLocaleString()}</p>
                  <div class="bot-actions">
                      <button class="action-btn download-xml-btn" data-name="${name}">
                          <i class="fas fa-download"></i> XML
                      </button>
                      <button class="action-btn download-image-btn" data-name="${name}">
                          <i class="fas fa-image"></i> Image
                      </button>
                      <button class="action-btn delete-btn" data-name="${name}">
                          <i class="fas fa-trash"></i> Delete
                      </button>
                  </div>
              </div>
          `;
          
          botContainer.appendChild(botCard);
      }
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', function() {
              const botName = this.getAttribute('data-name');
              deleteBot(botName);
          });
      });
      
      document.querySelectorAll('.download-xml-btn').forEach(btn => {
          btn.addEventListener('click', function() {
              const botName = this.getAttribute('data-name');
              downloadBotXml(botName);
          });
      });
      
      document.querySelectorAll('.download-image-btn').forEach(btn => {
          btn.addEventListener('click', function() {
              const botName = this.getAttribute('data-name');
              downloadBotImage(botName);
          });
      });
      
      updateBotCount();
  }
  
  function updateBotCount() {
      const bots = JSON.parse(localStorage.getItem('bots')) || {};
      const count = Object.keys(bots).length;
      document.getElementById('botCount').textContent = `${count}/${MAX_BOTS} bots`;
  }
  
  function deleteBot(name) {
      if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
          let bots = JSON.parse(localStorage.getItem('bots')) || {};
          delete bots[name];
          localStorage.setItem('bots', JSON.stringify(bots));
          loadBots();
          alert(`"${name}" has been deleted successfully.`);
      }
  }
  
  function downloadBotXml(name) {
      const bots = JSON.parse(localStorage.getItem('bots')) || {};
      const bot = bots[name];
      
      if (bot) {
          try {
              const blob = new Blob([bot.xml], { type: 'application/xml' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${name}.xml`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 100);
          } catch (error) {
              console.error('Error downloading XML:', error);
              alert('Error downloading the bot file. Please try again.');
          }
      }
  }
  
  function downloadBotImage(name) {
      const bots = JSON.parse(localStorage.getItem('bots')) || {};
      const bot = bots[name];
      
      if (bot && bot.image) {
          try {
              const a = document.createElement('a');
              a.href = bot.image;
              a.download = `${name}_performance.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
          } catch (error) {
              console.error('Error downloading image:', error);
              alert('Error downloading the performance image. Please try again.');
          }
      }
  }
});