import { createRouter, createWebHashHistory } from 'vue-router';
import GameView from '../views/GameView.vue';

const routes = [
  {
    path: '/',
    name: 'game',
    component: GameView
  }
];

const router = createRouter({
  history: createWebHashHistory(),  // 改为hash模式，支持本地文件打开
  routes
});

export default router;