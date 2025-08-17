<template>
  <div class="game-container" v-cloak>
    <!-- 顶部导航栏 -->
    <div class="navbar">
      <h1>海龟汤游戏</h1>
    </div>
    
    <!-- 对话区域 -->
    <div class="chat-container" id="chatContainer">
      <!-- 对话历史 -->
      <div class="message-list">
        <!-- 系统提示 -->
        <div class="system-message">
          <span>游戏开始</span>
        </div>
        
        <!-- 初始消息 -->
        <div class="message-left">
          <div class="message-bubble">
            <p>欢迎来到海龟汤游戏！我会回答"是"、"否"或"无法回答"，请开始提问。</p>
            <span class="timestamp">{{ formatTime(Date.now()) }}</span>
          </div>
        </div>
        
        <!-- 谜题消息 -->
        <div class="message-left" v-if="puzzle">
          <div class="message-bubble">
            <p>{{ puzzle }}</p>
            <span class="timestamp">{{ formatTime(Date.now()) }}</span>
          </div>
        </div>
        
        <!-- 加载状态 -->
        <div class="loading" v-if="isLoading">
          <div class="spinner"></div>
        </div>
        
        <!-- 对话消息 -->
        <div v-for="(message, index) in chatHistory" :key="index" :class="message.role === 'assistant' ? 'message-left' : 'message-right'">
          <div class="message-bubble">
            <p>{{ message.content }}</p>
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
          </div>
        </div>
        
        <!-- 游戏结束 -->
        <div class="game-over" v-if="gameOver">
          <h3>游戏结束</h3>
          <p>核心条件：</p>
          <ul>
            <li v-for="(cond, i) in conditions" :key="i">{{ cond }}</li>
          </ul>
          <p>汤底：{{ soupBase }}</p>
          <button @click="restartGame">再来一局</button>
        </div>
      </div>
    </div>
    
    <!-- 输入区域 -->
    <div class="input-area" v-if="!gameOver">
      <form @submit.prevent="handleSubmit">
        <input
          v-model="question"
          type="text"
          placeholder="输入你的问题..."
          :disabled="isLoading"
        >
        <button
          type="submit"
          :disabled="!question.trim() || isLoading"
        >
          发送
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { generatePuzzle, askQuestion } from '@/api/deepseek';

// 游戏状态
const isLoading = ref(false);
const gameOver = ref(false);
const puzzle = ref('');
const question = ref('');
const chatHistory = ref([]); 
const soupBase = ref('');
const conditions = ref([]); 

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// 开始游戏
const startGame = async () => {
  isLoading.value = true;
  gameOver.value = false;
  chatHistory.value = []; 
  puzzle.value = '';
  soupBase.value = '';
  conditions.value = []; 
  question.value = '';
  
  try {
    // 仅在游戏开始时获取谜题和汤底，不获取条件
    const { puzzle: puzzleText, answer } = await generatePuzzle();
    puzzle.value = puzzleText;
    soupBase.value = answer;
    // 条件仅在游戏结束时获取
  } catch (error) {
    puzzle.value = '游戏加载失败，请刷新页面重试';
    console.error('游戏初始化失败:', error);
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};

// 提交问题 - 严格限制只处理answer和isCorrect
const handleSubmit = async () => {
  if (!question.value.trim() || gameOver.value) return;
  
  const userQuestion = question.value.trim();
  question.value = '';
  
  // 添加用户问题到对话历史
  chatHistory.value.push({
    role: 'user',
    content: userQuestion,
    timestamp: Date.now()
  });
  
  scrollToBottom();
  isLoading.value = true;
  
  try {
    // API调用仅获取answer和isCorrect，忽略其他参数
    const { answer, isCorrect, conditions: conditionsList } = await askQuestion(
      puzzle.value, 
      soupBase.value, 
      [], // 不传递条件列表
      chatHistory.value,
      userQuestion
    );
    
    // 添加AI回答到对话历史（仅"是"/"否"/"无法回答"）
    chatHistory.value.push({
      role: 'assistant',
      content: answer,
      timestamp: Date.now()
    });
    
    // 只有完全正确时才结束游戏并获取条件
    if (isCorrect) {
      gameOver.value = true;
      // 仅在此时获取并设置条件列表
      conditions.value = Array.isArray(conditionsList) ? conditionsList : [];
    }
  } catch (error) {
    chatHistory.value.push({
      role: 'assistant',
      content: '获取回答失败，请重试',
      timestamp: Date.now()
    });
    console.error('提问处理失败:', error);
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};

// 重新开始游戏
const restartGame = () => {
  startGame();
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    const container = document.getElementById('chatContainer');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
};

// 页面加载后立即初始化游戏
onMounted(() => {
  startGame();
});
</script>

<style scoped>
/* 基础样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* 防止初始闪动 */
[v-cloak] {
  display: none;
}

/* 整体布局 - 固定高度100vh */
.game-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  background-color: #e5e5e5; /* 统一灰色背景 */
  height: 100vh; /* 固定高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止整体滚动 */
}

/* 顶部导航栏 */
.navbar {
  background-color: #2563eb;
  color: white;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.navbar h1 {
  font-size: 1.25rem;
  font-weight: bold;
  text-align: center;
}

/* 对话区域 - 可滚动并隐藏滚动条 */
.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px; /* 为固定输入框预留空间 */
  background-color: #e5e5e5; /* 灰色背景 */
  
  /* 隐藏滚动条 */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* Chrome, Safari 和 Opera */
.chat-container::-webkit-scrollbar {
  display: none;
}

.message-list {
  max-width: 512px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 系统提示 */
.system-message {
  display: flex;
  justify-content: center;
}

.system-message span {
  background-color: #d1d5db;
  color: #4b5563;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
}

/* 消息气泡基础样式 */
.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  max-width: 75%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message-bubble p {
  margin-bottom: 4px;
  line-height: 1.4;
}

.timestamp {
  font-size: 0.7rem;
  display: block;
}

/* 左侧消息 (API) */
.message-left {
  display: flex;
  justify-content: flex-start;
}

.message-left .message-bubble {
  background-color: white;
  color: #1f2937;
  border-top-left-radius: 4px;
}

.message-left .timestamp {
  color: #9ca3af;
  text-align: left;
}

/* 右侧消息 (用户) */
.message-right {
  display: flex;
  justify-content: flex-end;
}

.message-right .message-bubble {
  background-color: #2563eb;
  color: white;
  border-top-right-radius: 4px;
}

.message-right .timestamp {
  color: #bfdbfe;
  text-align: right;
}

/* 加载状态 */
.loading {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(37, 99, 235, 0.2);
  border-radius: 50%;
  border-top-color: #2563eb;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 游戏结束 */
.game-over {
  text-align: center;
  padding: 16px;
  background-color: #d1d5db;
  border: 1px solid #9ca3af;
  border-radius: 12px;
}

.game-over h3 {
  font-size: 1.2rem;
  font-weight: bold;
  color: #4b5563;
  margin-bottom: 8px;
}

.game-over p {
  color: #374151;
  margin-bottom: 8px;
}

.game-over ul {
  text-align: left;
  margin-left: 24px;
  margin-bottom: 16px;
  color: #374151;
}

.game-over button {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: medium;
  cursor: pointer;
  transition: background-color 0.2s;
}

.game-over button:hover {
  background-color: #1d4ed8;
}

/* 输入区域 - 固定在底部 */
.input-area {
  background-color: #d1d5db;
  padding: 12px;
  border-top: 1px solid #9ca3af;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 800px;
  margin: 0 auto;
}

.input-area form {
  display: flex;
  gap: 8px;
  max-width: 512px;
  margin: 0 auto;
}

.input-area input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #9ca3af;
  border-radius: 20px;
  outline: none;
  transition: border-color 0.2s;
  background-color: white;
}

.input-area input:focus {
  border-color: #2563eb;
}

.input-area button {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 0 20px;
  border-radius: 20px;
  font-weight: medium;
  cursor: pointer;
  transition: background-color 0.2s;
}

.input-area button:hover {
  background-color: #1d4ed8;
}

.input-area button:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .message-bubble {
    max-width: 85%;
  }
  
  .chat-container {
    padding: 12px 8px;
    padding-bottom: 70px; /* 移动端输入框预留空间 */
  }
  
  .input-area {
    padding: 8px;
  }
}
</style>