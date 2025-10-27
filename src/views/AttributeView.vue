<template>
  <div class="attribute-view">
    <h1>Attribute Detail</h1>
    <p>
      Thông tin chi tiết attribute <strong>{{ name }}</strong
      >:
    </p>

    <div v-if="isLoading">Đang tải thông tin chi tiết...</div>
    <div v-else-if="attributeDetail">
      <p><strong>Name:</strong> {{ attributeDetail.name }}</p>
      <p><strong>Data Type:</strong> {{ attributeDetail.dataType }}</p>
      <p>
        <strong>Description:</strong>
        {{ attributeDetail.description || "Không có mô tả." }}
      </p>
      <p>
        <strong>Is Primary:</strong>
        {{ attributeDetail.isPrimary ? "Yes" : "No" }}
      </p>
      <p>
        <strong>Is Foreign:</strong>
        {{ attributeDetail.isForeign ? "Yes" : "No" }}
      </p>
    </div>
    <div v-else>Không tìm thấy thông tin chi tiết cho attribute này.</div>
  </div>
</template>

<script>
import { findAttributeByName } from "@/api/attribute";

export default {
  name: "AttributeView",
  props: ["name"],
  data() {
    return {
      attributeDetail: null,
      isLoading: false,
    };
  },
  watch: {
    name: {
      immediate: true,
      handler(newName) {
        if (newName) {
          this.loadAttributeByName(newName);
        }
      },
    },
  },
  methods: {
    async loadAttributeByName(name) {
      this.isLoading = true;
      this.attributeDetail = null;
      try {
        const attributeData = await findAttributeByName(name);
        this.attributeDetail =
          Array.isArray(attributeData) && attributeData.length > 0
            ? attributeData[0]
            : null;
      } catch (error) {
        this.attributeDetail = null;
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.attribute-view {
  max-width: 800px;
  margin: 40px auto;
  padding: 20px;
  background: white;
  font-family: Roboto, sans-serif;
}
h1 {
  font-size: 24px;
  margin-bottom: 16px;
}
p {
  margin-bottom: 10px;
}
</style>
