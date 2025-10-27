<template>
  <div>
    <div id="er-diagram" ref="erDiagram"></div>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="isLoading" class="loading-message">Loading...</p>
  </div>
</template>

<script>
import {
  fetchClassFullAttributes,
  fetchClassById,
  Classinheritances,
} from "@/api/classes.js";
import { getAssociationByAttrId } from "@/api/index.js";

const classCache = {};

export default {
  name: "ClassERImage",
  props: {
    classId: {
      type: [String, Number],
      required: true,
    },
  },
  data() {
    return {
      attributes: [],
      associations: [],
      relatedClassNames: {},
      inheritanceData: null,
      isLoading: false,
      errorMessage: "",
    };
  },
  mounted() {
    if (!window?.mermaid) {
      this.errorMessage = "Mermaid.js is not available in this environment.";
      this.$emit("loaded");
      return;
    }
    window.mermaid.initialize({ startOnLoad: false, theme: "neutral" });
    this.loadData();
  },
  watch: {
    attributes() {
      if (this.$refs.erDiagram) {
        this.$nextTick(this.renderDiagram);
      }
    },
  },
  methods: {
    async getClassName(id) {
      if (this.relatedClassNames[id]) return this.relatedClassNames[id];
      if (classCache[id]) {
        this.relatedClassNames[id] = classCache[id];
        return classCache[id];
      }
      try {
        const info = await fetchClassById(id);
        const name = info.name || `Class_${id}`;
        classCache[id] = name;
        this.relatedClassNames[id] = name;
        return name;
      } catch (e) {
        const fallback = `Class_${id}`;
        classCache[id] = fallback;
        this.relatedClassNames[id] = fallback;
        console.error(`Failed to fetch class ${id}:`, e);
        return fallback;
      }
    },

    async loadData() {
      this.isLoading = true;
      this.errorMessage = "";
      try {
        this.attributes = (await fetchClassFullAttributes(this.classId)) || [];

        const assocPromises = this.attributes.map(async (attr) => {
          try {
            const assoc = await getAssociationByAttrId(attr.id);
            if (assoc?.toClass) {
              return {
                fromAttr: attr.name,
                toClass: assoc.toClass,
                type: assoc.relationshipType || "ONE_TO_MANY",
              };
            }
          } catch (e) {
            console.warn(`[ASSOC] attr: ${attr.name}, error:`, e);
          }
          return null;
        });
        this.associations = (await Promise.all(assocPromises)).filter(Boolean);
        this.inheritanceData = await Classinheritances(this.classId);

        await Promise.all([
          this.getClassName(this.classId),
          this.loadRelatedClassInfo(),
        ]);

        if (this.inheritanceData?.name) {
          this.relatedClassNames[this.classId] = this.inheritanceData.name;
        }

        if (this.inheritanceData) {
          this.inheritanceData.parents.forEach((p) => {
            if (!this.relatedClassNames[p]) this.relatedClassNames[p] = p;
          });
          this.inheritanceData.children.forEach((c) => {
            if (!this.relatedClassNames[c]) this.relatedClassNames[c] = c;
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
        this.errorMessage = "Lỗi khi tải dữ liệu lớp.";
      } finally {
        this.isLoading = false;
        this.$nextTick(() => {
          this.renderDiagram();
          this.$emit("loaded");
        });
      }
    },

    async loadRelatedClassInfo() {
      const ids = [...new Set(this.associations.map((a) => a.toClass))];
      await Promise.all(ids.map((id) => this.getClassName(id)));
    },

    generateMermaidSyntax() {
      const mainClassName =
        this.relatedClassNames[this.classId] || `Class_${this.classId}`;
      const added = new Set([mainClassName]);

      let syntax = `erDiagram\n`;

      // Main class
      syntax += `  ${mainClassName} {\n`;
      const mainAttrs = this.attributes.filter((a) => a.name?.trim());
      if (mainAttrs.length === 0) {
        syntax += `    string placeholder\n`;
      } else {
        const uniqueAttrsMap = new Map();
        mainAttrs.forEach((a) => {
          const name = a.name.trim();
          if (name && !uniqueAttrsMap.has(name)) {
            uniqueAttrsMap.set(name, a.dataType || "string");
          }
        });

        uniqueAttrsMap.forEach((dataType, attrName) => {
          syntax += `    ${dataType} ${attrName}\n`;
        });
      }
      syntax += `  }\n`;

      // Related classes
      this.associations.forEach((assoc) => {
        const id = assoc.toClass;
        const relatedName = this.relatedClassNames[id] || `Class_${id}`;
        if (!added.has(relatedName) && relatedName !== mainClassName) {
          syntax += `  ${relatedName}\n`;
          added.add(relatedName);
        }
      });

      // Parent classes
      if (this.inheritanceData?.parents) {
        this.inheritanceData.parents.forEach((parentName) => {
          if (!added.has(parentName) && parentName !== mainClassName) {
            syntax += `  ${parentName}\n`;
            added.add(parentName);
          }
        });
      }

      // Child classes
      if (this.inheritanceData?.children) {
        this.inheritanceData.children.forEach((childName) => {
          if (!added.has(childName) && childName !== mainClassName) {
            syntax += `  ${childName}\n`;
            added.add(childName);
          }
        });
      }

      const groupedAssociations = {};
      this.associations.forEach((assoc) => {
        const id = assoc.toClass;
        const relatedName = this.relatedClassNames[id] || `Class_${id}`;
        if (relatedName === mainClassName) return;

        const attrLabel = assoc.fromAttr.trim();
        if (!groupedAssociations[relatedName]) {
          groupedAssociations[relatedName] = {
            type: assoc.type,
            labels: [attrLabel],
          };
        } else {
          groupedAssociations[relatedName].labels.push(attrLabel);
        }
      });

      Object.entries(groupedAssociations).forEach(
        ([relatedName, { type, labels }]) => {
          const relationType =
            {
              ONE_TO_ONE: "||--||",
              ONE_TO_MANY: "||--o{",
              MANY_TO_ONE: "}o--||",
              MANY_TO_MANY: "}o--o{",
            }[type] || "||--o{";
          const combinedLabel =
            labels.length > 1
              ? `"${labels.join(", ")}"`
              : labels[0].includes("_")
              ? `"${labels[0]}"`
              : labels[0];
          syntax += `  ${mainClassName} ${relationType} ${relatedName} : ${combinedLabel}\n`;
        }
      );

      if (this.inheritanceData?.parents) {
        this.inheritanceData.parents.forEach((parentName) => {
          if (parentName !== mainClassName) {
            syntax += `  ${parentName} ||--|| ${mainClassName} : "inheritance"\n`;
          }
        });
      }
      if (this.inheritanceData?.children) {
        this.inheritanceData.children.forEach((childName) => {
          if (childName !== mainClassName) {
            syntax += `  ${mainClassName} ||--|| ${childName} : "inheritance"\n`;
          }
        });
      }

      return syntax;
    },

    async renderDiagram() {
      if (
        !this.attributes.length ||
        this.errorMessage ||
        !window?.mermaid ||
        !this.$refs.erDiagram
      ) {
        this.$emit("loaded");
        return;
      }

      const element = this.$refs.erDiagram;
      element.innerHTML = "";
      const diagramId = `erDiagram_${this.classId}_${Date.now()}`;
      const diagramCode = this.generateMermaidSyntax();

      try {
        const { svg } = await window.mermaid.render(diagramId, diagramCode);
        element.innerHTML = svg;
        this.$emit("loaded");
      } catch (err) {
        this.errorMessage = "Lỗi khi render biểu đồ ER.";
        this.$emit("loaded");
      }
    },
  },
};
</script>

<style scoped>
.error-message {
  color: red;
  font-weight: bold;
  margin-top: 10px;
}
.loading-message {
  color: #555;
  font-style: italic;
  margin-top: 10px;
}
#er-diagram {
  margin: 20px auto;
  max-width: 100%;
  background: white;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
  display: flex;
  justify-content: center;
}
</style>
