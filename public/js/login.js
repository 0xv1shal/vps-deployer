// Password visibility toggle
      const toggleBtn = document.getElementById('togglePassword');
      const passwordField = document.getElementById('password');
      
      if (toggleBtn && passwordField) {
        toggleBtn.addEventListener('click', function() {
          const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
          passwordField.setAttribute('type', type);
          const icon = this.querySelector('i');
          icon.classList.toggle('bi-eye');
          icon.classList.toggle('bi-eye-slash');
        });
      }
      
      // Auto-dismiss alerts after 5 seconds
      document.querySelectorAll('.alert').forEach(alert => {
        setTimeout(() => {
          const bsAlert = new bootstrap.Alert(alert);
          bsAlert.close();
        }, 5000);
      });