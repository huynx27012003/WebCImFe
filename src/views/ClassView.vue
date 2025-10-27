<template>
  <div class="class-page">
    <Loading v-if="isLoading" />
    <template v-else>
      <!-- Sidebar -->
      <aside class="sidebar-left">
        <h2>AT-Digital-CIM</h2>
        <ul>
          <li><a href="/">Index</a></li>
        </ul>
      </aside>
      <!-- Main content -->
      <main class="class-content">
        <h1 class="class-title">Class: {{ classInfo.name }}</h1>
        <p class="class-description">
          {{ classInfo.description || "No description available." }}
        </p>
        <section
          id="Inheritance"
          class="inheritance-section"
          v-if="classInfo.id"
        >
          <h2>Inheritance</h2>
          <ul class="inheritance-tree">
            <!-- Parents -->
            <li v-if="inheritanceData.parents?.length">
              <ul>
                <li
                  v-for="parent in inheritanceData.parents"
                  :key="parent"
                  class="indent-level-1"
                >
                  <router-link
                    :to="`/class/${encodeURIComponent(parent)}`"
                    class="slot-link"
                  >
                    {{ parent }}
                  </router-link>
                </li>
              </ul>
            </li>

            <!-- Current class -->
            <li class="current-class indent-level-2">
              {{ classInfo.name }}
            </li>

            <!-- Children -->
            <li v-if="inheritanceData.children?.length">
              <ul>
                <li
                  v-for="child in inheritanceData.children"
                  :key="child"
                  class="indent-level-3"
                >
                  <router-link
                    :to="`/class/${encodeURIComponent(child)}`"
                    class="slot-link"
                  >
                    {{ child }}
                  </router-link>
                </li>
              </ul>
            </li>
          </ul>
        </section>

        <!-- ER Image Section -->
        <template v-if="classInfo.id">
          <ClassERImage :class-id="classInfo.id" />
        </template>
        <template v-else>
          <div class="no-image">No image available.</div>
        </template>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <section v-if="columns.length" id="Slots" class="slots-section">
          <div class="section-header">
            <h2>Slots</h2>
            <el-button
              v-if="
                $store.state.user &&
                $store.state.user.authorities &&
                $store.state.user.authorities.includes('ADMIN')
              "
              type="primary"
              class="add-attribute-btn"
              @click="addAttribute"
            >
              +
            </el-button>
          </div>
          <table class="slot-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cardinality and Range</th>
                <th>Description</th>
                <th>Inheritance</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(col, index) in columns"
                :key="index"
                @contextmenu.prevent="openAttrMenu(col, index, $event)"
              >
                <td class="name-cell">
                  <router-link :to="`/attribute/${col.name}`" class="slot-link">
                    {{ col.name }}
                  </router-link>
                </td>
                <td class="cardinality-cell">
                  <div class="cardinality">
                    {{ formatCardinality(col.relationshipType) }}
                  </div>
                  <div class="range">{{ col.dataType }}</div>
                </td>
                <td>{{ col.description || "" }}</td>
                <td class="inheritance-cell">
                  <router-link
                    v-if="col.inheritance && col.inheritance !== 'direct'"
                    :to="`/class/${encodeURIComponent(col.inheritance)}`"
                    class="slot-link"
                  >
                    {{ col.inheritance }}
                  </router-link>
                  <span v-else>{{ col.inheritance || "-" }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <div v-else-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <div v-else>No slot data found.</div>

        <!-- Context menu cho attribute -->
        <div
          v-if="
            attrMenuVisible &&
            $store.state.user &&
            $store.state.user.authorities &&
            $store.state.user.authorities.includes('ADMIN')
          "
          :style="{
            position: 'fixed',
            top: attrMenuY + 'px',
            left: attrMenuX + 'px',
            zIndex: 9999,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }"
          @mouseleave="attrMenuVisible = false"
        >
          <div class="context-item" @click="editAttribute">Edit Attribute</div>
          <div class="context-item" @click="addAttribute">Add Attribute</div>
          <div class="context-item" @click="deleteAttribute" style="color: red">
            Delete Attribute
          </div>
        </div>

        <!-- Dialog for editing/adding attribute -->
        <el-dialog
          v-model="showAttrDialog"
          :title="isEditAttr ? 'Edit Attribute' : 'Add Attribute'"
          width="400px"
        >
          <Loading v-if="isLoadingDialog" />
          <el-form v-else :model="editingAttr" label-width="100px">
            <el-form-item label="ID" v-if="isEditAttr">
              <el-input v-model="editingAttr.id" disabled />
            </el-form-item>
            <el-form-item label="Class ID" v-if="isEditAttr">
              <el-input v-model="editingAttr.classId" disabled />
            </el-form-item>
            <el-form-item label="Name">
              <el-input v-model="editingAttr.name" />
            </el-form-item>
            <el-form-item label="Data Type">
              <el-select v-model="editingAttr.dataType" style="width: 100%">
                <el-option
                  v-for="type in attrDataTypes"
                  :key="type"
                  :label="type"
                  :value="type"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-checkbox
                :model-value="editingAttr.isPrimary"
                @change="onPrimaryChange"
                >Primary Key</el-checkbox
              >
              <el-checkbox
                :model-value="editingAttr.isForeign"
                @change="onForeignChange"
                >Foreign Key</el-checkbox
              >
            </el-form-item>
            <el-form-item label="Description">
              <el-input v-model="editingAttr.description" type="textarea" />
            </el-form-item>

            <!-- Chỉ hiện nhóm association nếu là Foreign Key -->
            <template v-if="editingAttr.isForeign">
              <el-form-item label="To Class Name">
                <el-select
                  v-model="toClassId"
                  filterable
                  placeholder="Chọn class"
                  @change="onToClassChange"
                  style="width: 100%"
                >
                  <el-option
                    v-for="cls in classList"
                    :key="cls.id"
                    :label="cls.name"
                    :value="cls.id"
                  />
                </el-select>
                <span
                  v-if="!toClassId && editingAttr.isForeign"
                  style="color: red; font-size: 12px"
                >
                </span>
              </el-form-item>
              <el-form-item label="To Attribute Name">
                <el-select
                  v-model="association.toAttributeId"
                  filterable
                  placeholder="Chọn attribute"
                  style="width: 100%"
                  :disabled="!toClassId"
                >
                  <el-option
                    v-for="attr in toClassAttributes"
                    :key="attr.id"
                    :label="attr.name"
                    :value="attr.id"
                  />
                </el-select>
                <span
                  v-if="
                    editingAttr.isForeign &&
                    !association.toAttributeId &&
                    toClassId
                  "
                  style="color: red; font-size: 12px"
                >
                </span>
              </el-form-item>
              <el-form-item label="Relationship Type">
                <el-select
                  v-model="association.relationshipType"
                  style="width: 100%"
                >
                  <el-option label="ONE_TO_ONE" value="ONE_TO_ONE" />
                  <el-option label="ONE_TO_MANY" value="ONE_TO_MANY" />
                  <el-option label="MANY_TO_ONE" value="MANY_TO_ONE" />
                  <el-option label="MANY_TO_MANY" value="MANY_TO_MANY" />
                </el-select>
              </el-form-item>
            </template>
          </el-form>
          <template #footer>
            <el-button @click="showAttrDialog = false">Cancel</el-button>
            <el-button
              type="primary"
              @click="saveAttribute"
              :disabled="isLoadingDialog"
            >
              {{ isEditAttr ? "Save" : "Add" }}
            </el-button>
          </template>
        </el-dialog>
      </main>
      <aside class="toc-right">
        <h3>Table of contents</h3>
        <ul>
          <li
            v-for="item in tocItems"
            :key="item.id"
            :class="{ 'active-link': activeSection === item.id }"
          >
            <a href="#" @click.prevent="scrollToSection(item.id)">
              {{ item.title }}
            </a>
          </li>
        </ul>
      </aside>
    </template>
  </div>
</template>

<script>
import ClassERImage from "@/views/ClassERImage.vue";
import Loading from "@/components/Loading.vue";
import {
  fetchClassFullAttributes,
  findClassByName,
  Classinheritances,
} from "@/api/classes";
import {
  addAttributeToClass,
  updateAttribute,
  deleteAttributeById,
  deleteAttributeByName,
} from "@/api/attribute";
import {
  addNewAssociation,
  getAssociationByAttrId,
  updateAssociation,
  deleteAssociation,
} from "@/api/index";
import "element-plus/dist/index.css";
import { fetchClasses } from "@/api/classes";

export default {
  name: "ClassView",
  props: ["name"],
  components: {
    ClassERImage,
    Loading,
  },
  data() {
    return {
      columns: [],
      isLoading: true,
      isLoadingDialog: false,
      inheritanceData: {
        parents: [],
        children: [],
      },
      classInfo: {
        name: "",
        description: "",
        id: null,
        parentClass: null,
        image: "",
      },
      tocItems: [
        { id: "Inheritance", title: "Inheritance" },
        { id: "Slots", title: "Slots" },
      ],
      activeSection: null,
      errorMessage: "",
      selectedAttr: null,
      selectedAttrIndex: null,
      showAttrDialog: false,
      isEditAttr: false,
      editingAttr: {
        name: "",
        dataType: "string",
        isPrimary: false,
        isForeign: false,
        description: "",
      },
      association: {
        toClassName: "",
        toAttributeId: "",
        relationshipType: "ONE_TO_ONE",
        id: null,
      },
      attrDataTypes: [
        "string",
        "integer",
        "float",
        "boolean",
        "date",
        "datetime",
        "text",
        "real",
      ],
      attrMenuVisible: false,
      attrMenuX: 0,
      attrMenuY: 0,
      classList: [],
      toClassId: null,
      toClassAttributes: [],
      originalAttr: null,
    };
  },
  mounted() {
    window.addEventListener("scroll", this.trackSection);
    this.loadAllData(); // Gọi hàm tải tất cả dữ liệu khi component được mount
  },
  unmounted() {
    window.removeEventListener("scroll", this.trackSection);
  },
  watch: {
    name: {
      immediate: true,
      handler(newName) {
        if (newName) {
          this.loadAllData();
        }
      },
    },
  },
  methods: {
    async loadAllData() {
      this.isLoading = true;
      this.errorMessage = "";
      try {
        // Tải tất cả dữ liệu cần thiết song song
        const [classData, classList] = await Promise.all([
          findClassByName(this.name),
          fetchClasses(),
        ]);

        let selectedClass = null;
        if (Array.isArray(classData) && classData.length > 0) {
          selectedClass = classData.find(
            (item) => item.name.toLowerCase() === this.name.toLowerCase()
          );
          if (!selectedClass) selectedClass = classData[0];
        } else if (classData && typeof classData === "object" && classData.id) {
          selectedClass = classData;
        }

        if (selectedClass && selectedClass.id) {
          this.classInfo = {
            id: selectedClass.id,
            name: selectedClass.name || this.name,
            description: selectedClass.description || "",
            parentClass: selectedClass.parentClass || null,
            image: selectedClass.image || "",
          };

          // Tải attributes và inheritance song song
          const [attributes, inheritance] = await Promise.all([
            fetchClassFullAttributes(selectedClass.id),
            Classinheritances(selectedClass.id),
          ]);

          this.columns = Array.isArray(attributes) ? attributes : [];
          this.inheritanceData.parents = Array.isArray(inheritance.parents)
            ? inheritance.parents
            : [];
          this.inheritanceData.children = Array.isArray(inheritance.children)
            ? inheritance.children
            : [];
          this.classList = Array.isArray(classList) ? classList : [];
        } else {
          this.handleClassNotFound(this.name);
        }
      } catch (error) {
        console.error("Error loading class data:", error);
        this.handleClassNotFound(this.name);
      } finally {
        this.isLoading = false; // Tắt loading khi tất cả dữ liệu đã tải xong
      }
    },

    async loadClassAttributes(classId) {
      try {
        const slots = await fetchClassFullAttributes(classId);
        this.columns = Array.isArray(slots) ? slots : [];
      } catch (error) {
        console.error("Error loading class attributes:", error);
        this.errorMessage = `Failed to load attributes: ${error.message}`;
        this.columns = [];
      }
    },
    async loadInheritance(classId) {
      try {
        const data = await Classinheritances(classId);
        this.inheritanceData.parents = Array.isArray(data.parents)
          ? data.parents
          : [];
        this.inheritanceData.children = Array.isArray(data.children)
          ? data.children
          : [];
      } catch (err) {
        console.error("Error fetching inheritance data:", err);
      }
    },

    handleClassNotFound(name) {
      this.classInfo = {
        id: null,
        name: name,
        description: "No description available.",
        parentClass: null,
        image: "",
      };
      this.columns = [];
      this.errorMessage = `Class "${name}" not found.`;
    },

    formatCardinality(relType) {
      if (relType === "ONE_TO_ONE") return "1-1";
      if (relType === "ONE_TO_MANY") return "1-*";
      if (relType === "MANY_TO_ONE") return "*-1";
      if (relType === "MANY_TO_MANY") return "*-*";
      return "-";
    },
    scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) {
        const offset = 80;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    },
    trackSection() {
      for (const item of this.tocItems) {
        const el = document.getElementById(item.id);
        if (el && window.scrollY >= el.offsetTop - 100) {
          this.activeSection = item.id;
        }
      }
    },

    openAttrMenu(attr, idx, event) {
      this.selectedAttr = attr;
      this.selectedAttrIndex = idx;

      const menuWidth = 150;
      const menuHeight = 120;
      const viewportWidth = window.innerWidth;
      let x = event.clientX;
      let y = event.clientY - menuHeight;

      if (x + menuWidth > viewportWidth) {
        x = viewportWidth - menuWidth;
      }
      if (y < 0) {
        y = 0;
      }
      this.attrMenuX = Math.max(0, x);
      this.attrMenuY = y;
      this.attrMenuVisible = true;
    },
    async editAttribute() {
      this.isEditAttr = true;
      this.isLoadingDialog = true;
      this.editingAttr = { ...this.selectedAttr };
      this.originalAttr = { ...this.selectedAttr };
      if (!this.editingAttr.classId && this.classInfo.id) {
        this.editingAttr.classId = this.classInfo.id;
      }
      if (this.editingAttr.isForeign && this.editingAttr.id) {
        try {
          const association = await getAssociationByAttrId(this.editingAttr.id);
          this.association = {
            toClassName: association.toClassName || "",
            toAttributeId: association.toAttribute || null,
            relationshipType: association.relationshipType || "ONE_TO_ONE",
            id: association.id,
          };
          if (!this.classList.length) await this.loadClassList();
          const toClass = this.classList.find(
            (c) => c.id === association.toClass
          );
          this.toClassId = toClass ? toClass.id : null;
          this.association.toClassName = toClass ? toClass.name : "";
          if (this.toClassId) {
            await this.loadToClassAttributes(this.toClassId);
          }
        } catch (e) {
          console.error("Error fetching association:", e);
          this.association = {
            toClassName: "",
            toAttributeId: null,
            relationshipType: "ONE_TO_ONE",
            id: null,
          };
          this.toClassId = null;
          this.toClassAttributes = [];
        }
      } else {
        this.association = {
          toClassName: "",
          toAttributeId: null,
          relationshipType: "ONE_TO_ONE",
          id: null,
        };
        this.toClassId = null;
        this.toClassAttributes = [];
      }
      this.isLoadingDialog = false;
      this.showAttrDialog = true;
      this.attrMenuVisible = false;
    },

    async loadToClassAttributes(classId) {
      this.toClassAttributes = [];
      if (!classId) return;
      const selectedClass = this.classList.find((c) => c.id === classId);
      this.association.toClassName = selectedClass ? selectedClass.name : "";
      try {
        const detail = await fetchClassFullAttributes(classId);
        console.log("To class attributes:", detail);
        this.toClassAttributes = Array.isArray(detail)
          ? detail
          : detail && detail.attributes
          ? detail.attributes
          : [];
      } catch (e) {
        console.error("Error loading toClass attributes:", e);
        this.toClassAttributes = [];
      }
    },

    async onToClassChange(classId) {
      this.association.toAttributeId = "";
      await this.loadToClassAttributes(classId);
    },

    addAttribute() {
      this.isEditAttr = false;
      this.editingAttr = {
        name: "",
        dataType: "string",
        isPrimary: false,
        isForeign: false,
        description: "",
      };
      this.association = {
        toClassName: "",
        toAttributeId: "",
        relationshipType: "ONE_TO_ONE",
        id: null,
      };
      this.toClassId = null;
      this.toClassAttributes = [];
      this.loadClassList();
      this.showAttrDialog = true;
      this.attrMenuVisible = false;
    },

    async loadClassList() {
      try {
        const res = await fetchClasses();
        this.classList = Array.isArray(res) ? res : [];
      } catch (e) {
        console.error("Error loading class list:", e);
        this.classList = [];
      }
    },

    async saveAttribute() {
      this.isLoadingDialog = true;
      try {
        if (this.isEditAttr) {
          localStorage.setItem(
            "rollbackAttr",
            JSON.stringify(this.originalAttr)
          );
          await updateAttribute(this.editingAttr);

          // Là foreign key, cập nhật/tạo association
          if (this.editingAttr.isForeign) {
            const selectedAttr = this.toClassAttributes.find(
              (a) => a.id === this.association.toAttributeId
            );
            if (!selectedAttr) {
              this.$message.error("Bạn phải chọn thuộc tính liên kết!");
              this.isLoadingDialog = false;
              return;
            }
            const associationData = {
              fromAttributeName: this.editingAttr.name,
              toClassName: this.association.toClassName,
              toAttributeName: selectedAttr.name,
              relationshipType: this.association.relationshipType,
            };
            try {
              if (this.association.id) {
                associationData.id = this.association.id;
                await updateAssociation(associationData);
              } else {
                await addNewAssociation(this.classInfo.id, associationData);
              }
              this.$message.success("Cập nhật attribute thành công!");
            } catch (err) {
              const rollbackAttr = JSON.parse(
                localStorage.getItem("rollbackAttr")
              );
              if (rollbackAttr) {
                await updateAttribute(rollbackAttr);
              }
              this.$message.error(
                "Cập nhật mối quan hệ thất bại. Thuộc tính đã được hoàn tác."
              );
            }
          } else {
            this.$message.success("Cập nhật attribute thành công!");
          }
        } else {
          // Thêm attribute
          await addAttributeToClass(this.classInfo.id, this.editingAttr);

          // Nếu là foreign key, tiếp tục tạo association
          if (this.editingAttr.isForeign) {
            const selectedAttr = this.toClassAttributes.find(
              (a) => a.id === this.association.toAttributeId
            );
            const associationData = {
              fromAttributeName: this.editingAttr.name,
              toClassName: this.association.toClassName,
              toAttributeName: selectedAttr ? selectedAttr.name : "",
              toAttribute: this.association.toAttributeId,
              relationshipType: this.association.relationshipType,
            };
            try {
              await addNewAssociation(this.classInfo.id, associationData);
              this.$message.success("Thêm thuộc tính thành công!");
            } catch (err) {
              await deleteAttributeByName(this.editingAttr.name);
              this.$message.error(
                "Thêm mối quan hệ thất bại. Thuộc tính đã được hoàn tác."
              );
            }
          } else {
            this.$message.success("Thêm thuộc tính thành công!");
          }
        }
        await this.loadClassAttributes(this.classInfo.id);
      } catch (error) {
        console.error("Error saving attribute:", error);
        this.$message.error("Lưu attribute thất bại!");
      } finally {
        this.isLoadingDialog = false;
        this.showAttrDialog = false;
      }
    },

    onPrimaryChange(val) {
      this.editingAttr.isPrimary = val;
      if (val) this.editingAttr.isForeign = false;
    },
    onForeignChange(val) {
      this.editingAttr.isForeign = val;
      if (val) this.editingAttr.isPrimary = false;
    },

    async deleteAttribute() {
      this.attrMenuVisible = false;
      const attr = this.selectedAttr;
      if (!attr || !attr.id) return;
      try {
        // Nếu là foreign key
        if (attr.isForeign) {
          const assoc = await getAssociationByAttrId(attr.id);
          if (assoc && assoc.id) {
            await deleteAssociation(assoc.id);
          }
          await deleteAttributeById(attr.id);
        } else {
          await deleteAttributeById(attr.id);
        }
        this.$message.success("Xóa thuộc tính thành công!");
        await this.loadClassAttributes(this.classInfo.id);
      } catch (error) {
        this.$message.error("Xóa thuộc tính thất bại!");
        console.error(error);
      }
    },
  },
};
</script>

<style scoped>
.class-page {
  display: flex;
  background: #fff;
  color: #333;
}

.sidebar-left {
  width: 200px;
  margin-top: 80px;
  margin-left: 40px;
  padding: 20px;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  background: white;
}

.sidebar-left h2 {
  font-size: 20px;
  margin-bottom: 20px;
  color: black;
}

.sidebar-left ul {
  list-style: none;
  padding: 0;
}

.sidebar-left li {
  margin-bottom: 10px;
}

.sidebar-left a {
  color: #2e7d32;
  text-decoration: none;
}

.sidebar-left a:hover {
  color: red;
}

.class-content {
  flex: 1;
  padding: 40px 40px;
  margin: 0 auto;
  margin-left: 240px;
  margin-right: 240px;
  max-width: 1000px;
}

.class-title {
  font-size: 28px;
  color: #555;
  font-weight: initial;
  margin-bottom: 10px;
}

.class-description {
  font-size: 17px;
  line-height: 1.6;
  margin-bottom: 20px;
  font-style: italic;
  color: #333;
}

.zoom-container {
  display: flex;
  justify-content: center;
  position: relative;
  margin: 20px auto;
  max-width: 100%;
}

.class-image {
  width: auto;
  max-width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
  border: 1px solid #ccc;
}

.no-image {
  font-size: 16px;
  color: #666;
  margin-bottom: 30px;
  text-align: center;
}

.error-message {
  color: red;
  font-weight: bold;
}

.inheritance-section h2 {
  font-size: 22px;
  margin-bottom: 12px;
}

.inheritance-tree,
.inheritance-tree ul {
  list-style: none;
  padding-left: 20px;
  font-size: 17px;
  line-height: 1.5;
}

.inheritance-tree li {
  margin: 7px 7px;
}

.inheritance-tree a {
  color: #2e7d32;
  text-decoration: none;
}

.inheritance-tree a:hover {
  color: red;
}

.inheritance-tree .current-class {
  margin-right: 10px;
  font-weight: bold;
  color: Black;
}

.slots-section h2 {
  margin-top: 40px;
  margin-bottom: 16px;
  font-size: 22px;
}

.slot-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.slot-table th,
.slot-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.slot-table th {
  background-color: #f5f5f5;
}

.cardinality {
  color: #2e7d32;
}

.cardinality-cell {
  white-space: pre-line;
  line-height: 1.2;
}

.name-cell a:hover {
  color: red;
}

.inheritance-cell a:hover {
  color: red;
}

.slot-link {
  color: #2e7d32;
  text-decoration: none;
}

.toc-right {
  width: 140px;
  margin-top: 80px;
  margin-right: 40px;
  padding: 20px;
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  background: white;
}

.toc-right h3 {
  white-space: nowrap;
  font-size: 16px;
  margin-bottom: 16px;
  font-weight: 400;
}

.toc-right ul {
  list-style: none;
  padding: 0;
}

.toc-right li {
  margin-bottom: 10px;
}

.toc-right a,
.toc-right a:visited,
.toc-right a:focus,
.toc-right a:active {
  font-size: 13px;
  color: #333;
  text-decoration: none;
  outline: none;
  transition: color 0.2s ease;
}

.toc-right a:hover {
  color: red;
}
.indent-level-1 {
  padding-left: 10px;
}

.indent-level-2 {
  padding-left: 60px;
  font-weight: bold;
}

.indent-level-3 {
  padding-left: 80px;
}

.context-item {
  padding: 8px 16px;
  cursor: pointer;
}
.context-item:hover {
  background: #f5f5f5;
}

.add-attribute-btn {
  min-width: 35px;
  font-size: 18px;
  font-weight: bold;
  margin-top: 20px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
