<template>
  <div class="top-bar">
    <nav id="top-windows">
      <div class="left-bar">
        <div @click="goHome" class="iconHover logo-container" style="user-select: none">
          <img src="@/assets/images/ATDigital CIM(W).png" alt="Logo" style="height: 28px; width: auto; display: block" />
        </div>
      </div>

      <div class="center-bar" v-if="$store.state.isAuthenticated">
        <div class="search-container" :class="{ expanded: isExpanded }" @click="expandSearch">
          <i class="fa fa-search search-icon"></i>
          <input
            ref="searchInput"
            :placeholder="isExpanded ? 'Type to start searching' : 'Search'"
            @blur="collapseSearch"
            v-model="searchText"
            @input="onInput"
            :class="{ expanded: isExpanded }"
          />

          <Teleport to="body">
            <ul v-if="isExpanded && searchText && suggestions.length" class="search-suggest" :style="searchSuggestStyle">
              <li v-for="(item, index) in suggestions" :key="index" @mousedown.prevent="selectSuggestion(item)">
                {{ item.type }}: {{ item.name }}
              </li>
            </ul>
          </Teleport>
        </div>
      </div>

      <div class="right-bar">
        <span v-if="user" class="greeting">Xin chào, <b>{{ username }}</b></span>
        <el-dropdown @command="handleCommand" trigger="click">
          <div class="iconHover" style="width: 45px; height: 38px; background-color: inherit; display: flex; align-items: center; justify-content: center; margin-right: 20px;">
            <i style="font-size: 19px; color: white" class="fa-solid fa-gears"></i>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="config">
                <i style="font-size: 19px" class="fa-solid fa-wrench"></i>
                Config Server
              </el-dropdown-item>
              <el-dropdown-item v-if="$store.state.isAuthenticated" command="logout" divided>
                <i style="font-size: 19px" class="fa-solid fa-right-from-bracket"></i>
                Logout
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </nav>

    <el-dialog v-model="dialogConfig" title="Config server address" width="400px">
      <el-form :model="formConfig" label-width="80px">
        <el-form-item label="Domain">
          <el-input v-model="formConfig.domain" placeholder="https://domain.com/api/"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogConfig = false">Cancel</el-button>
          <el-button type="primary" @click="setServerAddr">Save</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
  </template>

<script>
import { searchItems } from "@/api/index.js";
import { mapState } from "vuex";
import client from "@/api/client";

const CLIENT_ID = "1002";

export default {
  name: "TopBar",
  data() {
    return {
      isExpanded: false,
      searchText: "",
      suggestions: [],
      suggestPosition: { top: 0, left: 0, width: 0 },
      dialogConfig: false,
      formConfig: { domain: "" },
    };
  },
  computed: {
    ...mapState(["serverAddr", "user"]),
    searchSuggestStyle() {
      return {
        position: "fixed",
        top: this.suggestPosition.top + "px",
        left: this.suggestPosition.left + "px",
        width: this.suggestPosition.width + "px",
        zIndex: 3000,
      };
    },
    username() {
      return this.user?.username || "";
    },
  },
  mounted() {
    this.formConfig.domain = this.serverAddr;
  },
  methods: {
  goHome() {
    this.$router.push({ name: "HomeView" }).catch(() => {
      // Ignore navigation errors
    });
  },
  expandSearch() {
    this.isExpanded = true;
    this.$nextTick(() => {
      this.$refs.searchInput?.focus();
      this.updateSuggestPosition();
    });
  },
  collapseSearch() {
    if (!this.searchText) this.isExpanded = false;
  },
  async onInput() {
    const keyword = this.searchText.trim();
    if (!keyword) { 
      this.suggestions = []; 
      return; 
    }
    try {
      const data = await searchItems(keyword);
      this.suggestions = data.slice(0, 10);
    } catch (e) { 
      this.suggestions = []; 
    }
    this.updateSuggestPosition();
  },
  updateSuggestPosition() {
    const input = this.$refs.searchInput;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    this.suggestPosition = { 
      top: rect.bottom + window.scrollY, 
      left: rect.left + window.scrollX, 
      width: rect.width 
    };
  },
  selectSuggestion(item) {
    this.searchText = `${item.type}: ${item.name}`;
    this.suggestions = [];
    this.isExpanded = false;
    this.$router.push(`/${item.type}/${item.name}`).catch(() => {
      // Ignore navigation errors
    });
  },
  handleCommand(command) {
    if (command === "config") {
      this.dialogConfig = true;
      this.formConfig.domain = this.serverAddr;
      return;
    }
    if (command === "logout") {
      this.$store.commit("logout");
      try { 
        localStorage.removeItem('accessToken' + CLIENT_ID); 
        this.$router.replace({ name: 'login' });
      } catch(e) {
        // Ignore localStorage errors
      }
      const redirectUri = window.location.origin + '/login';
      client.get('/auth/sso/logout_url', { params: { redirectUri }})
        .then(resp => {
          const url = (resp.data && resp.data.data) || null;
          if (url) window.location.href = url; 
          else this.$router.replace({ name: 'login' });
        })
        .catch(() => this.$router.replace({ name: 'login' }))
        .finally(() => this.$message.success('Đăng xuất thành công!'));
    }
  },
  setServerAddr() {
    const d = this.formConfig.domain;
    if (d && /^https?:\/\//.test(d)) {
      this.$store.commit('setServerAddr', d);
      this.dialogConfig = false;
      this.$message.success('Config successfully');
    } else {
      this.$message.error('Invalid domain');
    }
  },
},
};
</script>

<style lang="scss" scoped>
nav {
  background-color: #012596;
  height: 50px;
  width: 100vw;
  position: fixed;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  -webkit-app-region: drag;
  border-bottom: 1px solid #aeb6bf;
  overflow: visible;
}

.left-bar,
.center-bar,
.right-bar {
  display: flex;
  align-items: center;
}

.left-bar { z-index: 10; width: 15%; min-width: 80px; }

.center-bar { width: 70%; justify-content: center; }

.right-bar { flex: 0 0 auto; justify-content: flex-end; padding-right: 16px; }

.logo-container { border-radius: 12px; transition: background 0.2s, box-shadow 0.2s; padding: 10px 8px; display: flex; align-items: center; }

.search-container {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 4px;
  padding: 4px 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 200px;
  cursor: pointer;
  position: relative;
  z-index: 2000;

  .search-icon { color: #012596; font-size: 20px; margin-right: 8px; transition: color 0.3s; }

  input {
    border: none; background: transparent; outline: none; color: #fff; font-size: 18px; width: 80px;
    transition: width 0.3s, background 0.3s, color 0.3s;
    &::placeholder { color: rgba(0, 0, 0, 0.52); opacity: 1; }
  }

  &.expanded { background: #fff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); width: 400px; }
  &.expanded .search-icon { color: #012596; }
  &.expanded input { color: #333; width: 320px; }
  &.expanded input::placeholder { color: #888; }
}

.search-suggest {
  background: #fff; border-radius: 0 0 4px 4px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px; overflow-y: auto; margin: 0; padding: 0; list-style: none;
  li { padding: 10px 16px; cursor: pointer; font-size: 16px; color: #222; }
  li:hover { background: #f5f5f5; color: black; }
}

.greeting { color: #fff; margin-right: 20px; font-size: 15px; font-weight: 500; letter-spacing: 0.5px; white-space: nowrap; }
</style>

