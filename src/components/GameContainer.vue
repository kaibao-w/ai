<template>
  <div class="game-container" v-cloak>
    <!-- 背景装饰元素 -->
    <div class="bg-decoration"></div>
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
            <p>欢迎来到海龟汤游戏！我会回答"是"、"否"或"无关"，请开始提问。</p>
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
        
        <!-- 加载状态 - 动态提示文字 -->
        <div class="loading" v-if="isLoading">
          <div class="spinner"></div>
          <span class="loading-text">{{ loadingText }}</span>
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

// 游戏状态 - 添加loadingText动态控制提示文字
const isLoading = ref(false);
const loadingText = ref(''); // 动态加载提示文字
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

// 开始游戏 - 设置获取题目提示
const startGame = async () => {
  isLoading.value = true;
  loadingText.value = '正在获取题目...'; // 获取题目时的提示
  gameOver.value = false;
  chatHistory.value = []; 
  puzzle.value = '';
  soupBase.value = '';
  conditions.value = []; 
  question.value = '';
  
  try {
    const { puzzle: puzzleText, answer } = await generatePuzzle();
    puzzle.value = puzzleText;
    soupBase.value = answer;
  } catch (error) {
    puzzle.value = '游戏加载失败，请刷新页面重试';
    console.error('游戏初始化失败:', error);
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};

// 提交问题 - 设置思考中提示
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
  loadingText.value = '正在思考...'; // 处理问题时的提示
  
  try {
    const { answer, isCorrect, conditions: conditionsList } = await askQuestion(
      puzzle.value, 
      soupBase.value, 
      [], 
      chatHistory.value,
      userQuestion
    );
    
    chatHistory.value.push({
      role: 'assistant',
      content: answer,
      timestamp: Date.now()
    });
    
    if (isCorrect) {
      gameOver.value = true;
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
  background-color: #f8fafc; /* 更轻柔的背景色 */
  height: 100vh; /* 固定高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止整体滚动 */
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  position: relative; /* 为背景装饰元素定位 */
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.05); /* 轻微阴影效果 */
}

/* 顶部导航栏 */
.navbar {
  background: linear-gradient(135deg, #4f46e5, #3b82f6); /* 渐变背景 */
  color: white;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  z-index: 10;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.navbar h1 {
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 对话区域 - 可滚动并隐藏滚动条 */
.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  padding-bottom: 90px; /* 为固定输入框预留空间 */
  background-color: #f8fafc; /* 更轻柔的背景色 */
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233b82f6' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  
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
  margin: 12px 0;
  animation: fadeIn 0.5s ease-out;
}

.system-message span {
  background-color: rgba(209, 213, 219, 0.5);
  color: #4b5563;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.85rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.04);
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.2);
  letter-spacing: 0.3px;
}

/* 消息气泡基础样式 */
.message-bubble {
  padding: 16px 20px;
  border-radius: 18px;
  max-width: 75%;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  word-break: break-word;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.message-bubble:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.message-bubble p {
  margin-bottom: 6px;
  line-height: 1.5;
  font-size: 0.95rem;
}

.timestamp {
  font-size: 0.7rem;
  display: block;
  opacity: 0.8;
}

/* 左侧消息 (API) */
.message-left {
  display: flex;
  justify-content: flex-start;
  animation: fadeIn 0.3s ease-out;
}

.message-left .message-bubble {
  background-color: rgba(255, 255, 255, 0.95);
  color: #1f2937;
  border-top-left-radius: 4px;
  border-left: 3px solid #3b82f6;
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.1);
}

.message-left .timestamp {
  color: #9ca3af;
  text-align: left;
}

/* 右侧消息 (用户) */
.message-right {
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.3s ease-out;
}

.message-right .message-bubble {
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
  color: white;
  border-top-right-radius: 4px;
  box-shadow: 0 3px 10px rgba(79, 70, 229, 0.15);
}

.message-right .timestamp {
  color: #bfdbfe;
  text-align: right;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 加载状态 */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  gap: 12px;
  animation: pulse 2s infinite ease-in-out;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}

.loading-text {
  color: #4b5563;
  font-size: 0.95rem;
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.loading-text::after {
  content: '...';
  position: absolute;
  animation: ellipsis 1.5s infinite;
  margin-left: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 0.8; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1); }
  100% { opacity: 0.8; transform: scale(0.98); }
}

@keyframes ellipsis {
  0% { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
}

/* 游戏结束 */
.game-over {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, #f9fafb, #f3f4f6);
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  animation: slideUp 0.5s ease-out;
  border: 1px solid rgba(209, 213, 219, 0.5);
}

.game-over::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #4f46e5, #3b82f6, #60a5fa);
}

.game-over h3 {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
}

.game-over h3::after {
  content: '🎉';
  position: absolute;
  right: -30px;
  top: -2px;
}

.game-over p {
  color: #374151;
  margin-bottom: 12px;
  font-weight: 500;
}

.game-over ul {
  text-align: left;
  margin: 0 auto 20px;
  max-width: 80%;
  color: #4b5563;
  background-color: white;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  list-style-type: none;
}

.game-over ul li {
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
}

.game-over ul li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #3b82f6;
  font-weight: bold;
}

.game-over button {
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
  color: white;
  border: none;
  padding: 12px 28px;
  border-radius: 30px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.game-over button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.game-over button:active {
  transform: translateY(1px);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 输入区域 - 固定在底部 */
.input-area {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  padding: 16px;
  border-top: 1px solid rgba(209, 213, 219, 0.5);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
  z-index: 100;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  transition: transform 0.3s ease;
}

.input-area form {
  display: flex;
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
  align-items: center;
}

.input-area input {
  flex: 1;
  padding: 14px 20px;
  border: 2px solid rgba(209, 213, 219, 0.8);
  border-radius: 30px;
  outline: none;
  transition: all 0.3s ease;
  background-color: white;
  font-size: 0.95rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.input-area input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.input-area input::placeholder {
  color: #9ca3af;
}

.input-area button {
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 30px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-area button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.input-area button:active {
  transform: translateY(1px);
}

.input-area button:disabled {
  background: linear-gradient(135deg, #93c5fd, #bfdbfe);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: -1;
  opacity: 0.5;
  background-image: 
    radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.03) 0%, transparent 70%);
  animation: bgShift 15s ease-in-out infinite alternate;
}

@keyframes bgShift {
  0% { background-position: 0% 0%; }
  100% { background-position: 5% 5%; }
}

/* 全局过渡效果 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
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
  
  .navbar h1 {
    font-size: 1.3rem;
  }
}
</style>