
function resetLoginButton() {
    const loader = document.getElementById('loader');
    const btnText = document.querySelector('.btn-text');
    loader.style.display = 'none';
    btnText.textContent = "LOGIN";
  }
  
  // Initialize on load
  window.onload = function() {
    waveEffect();
    resetLoginButton();
    
    // Database connection monitoring
    database.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            console.log("Database connected");
        } else {
            console.log("Database disconnected");
        }
    });
  };
  
  // Login function
  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loader = document.getElementById('loader');
    const btnText = document.querySelector('.btn-text');
  
    // Show loading state
    loader.style.display = 'block';
    btnText.textContent = "Authenticating...";
  
    try {
        // Firebase authentication
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Store default username in database
        await database.ref('users/' + userCredential.user.uid).update({
            username: "Logan001",
            lastLogin: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Success - redirect
        showMessage("Login successful!", true);
        setTimeout(() => {
            window.location.href = "analysis.html";
        }, 1500);
        
    } catch (error) {
        console.error("Login error:", error);
        
        let message = "Login failed";
        if (error.code === "auth/user-not-found") {
            message = "Account not found";
        } else if (error.code === "auth/wrong-password") {
            message = "Incorrect password";
        } else if (error.code === "auth/too-many-requests") {
            message = "Too many attempts. Try again later";
        }
        
        showMessage(message, false);
        setTimeout(resetLoginButton, 2000);
    }
  });
  
  function showMessage(message, isSuccess) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.color = 'white';
    messageDiv.style.backgroundColor = isSuccess ? '#28a745' : '#dc3545';
    messageDiv.style.zIndex = '1000';
    messageDiv.style.animation = 'fadeIn 0.3s ease-in-out';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'fadeOut 0.3s ease-in-out';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
  }
  
  // Add fade animations to style
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, -20px); }
    }
  `;
  document.head.appendChild(style);