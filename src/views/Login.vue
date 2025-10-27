<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2 class="login-title">Đăng nhập</h2>
      <div class="login-form" style="text-align:center;">
        <el-button type="success" @click="startSSOPopupLogin">Login with SSO</el-button>
      </div>
    </el-card>
  </div>
  </template>

<script>
import client from "@/api/client";
import { mapMutations } from "vuex";

const CLIENT_ID = '1002';

export default {
  name: "Login",
  methods: {
    ...mapMutations(["setAuthenticated", "setUser"]),
    startSSOPopupLogin() {
      const callbackUrl = window.location.origin + '/oauth2-popup-callback.html';
      client.get('/auth/sso/login_url', { params: { redirectUri: callbackUrl }})
        .then(resp => {
          const res = resp.data || {};
          const loginUrl = res.data;
          const url = (loginUrl.indexOf('?') === -1 ? (loginUrl + '?') : (loginUrl + '&')) + 'popup=true';
          window.open(url, 'smart-sso-login', 'width=420,height=560,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');
          const handler = (event) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data || {};
            if (data.type === 'smart-sso-oauth' && data.code) {
              window.removeEventListener('message', handler);
              this.exchangeCodeForToken(data.code);
            }
          };
          window.addEventListener('message', handler, false);
        })
        .catch(() => this.$message.error('Không lấy được SSO login URL'));
    },
    exchangeCodeForToken(code) {
      client.get('/auth/sso/access-token', { params: { code }})
        .then(resp => {
          const res = resp.data || {};
          if (res.code !== 1) { this.$message.error(res.message || 'SSO login failed'); return; }
          const ssoToken = res.data;
          if (!ssoToken || !ssoToken.accessToken) { this.$message.error('Thiếu accessToken'); return; }
          localStorage.setItem('accessToken' + CLIENT_ID, ssoToken.accessToken);
          const username = ssoToken.tokenUser?.username || 'sso-user';
          const roles = ssoToken.tokenUser?.roles || [];
          const authorities = roles.map(r => (r || '').toUpperCase());
          const userData = { username, roles, authorities, role: roles[0] || null };
          try { localStorage.setItem('user' + CLIENT_ID, JSON.stringify(userData)); } catch(e) {

          }
          this.setAuthenticated(true);
          this.setUser(userData);
          this.$router.replace({ name: 'HomeView' });
        })
        .catch(() => this.$message.error('Không đổi code lấy token được'));
    }
  },
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6fa;
}
.login-card {
  width: 350px;
  padding: 32px 24px;
}
.login-title {
  text-align: center;
  margin-bottom: 24px;
  font-weight: bold;
  font-size: 22px;
  color: #333;
}
.login-form {
  margin-top: 12px;
}
</style>
