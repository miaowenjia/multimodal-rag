import { createRouter, createWebHistory } from "vue-router";
import DocumentManagerView from "../views/DocumentManagerView.vue";
import ChatView from "../views/ChatView.vue";
import SettingsView from "../views/SettingsView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/chat"
    },
    {
      path: "/documents",
      name: "documents",
      component: DocumentManagerView
    },
    {
      path: "/chat/:sessionId?",
      name: "chat",
      component: ChatView
    },
    {
      path: "/settings",
      name: "settings",
      component: SettingsView
    }
  ]
});

export default router;
