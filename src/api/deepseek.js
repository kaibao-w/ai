import axios from 'axios';

// DeepSeek API配置
const DEEPSEEK_API_KEY = 'sk-ccbec3a34599494f8cdd5ed2add8363e'; // 用户提供的API Key，请替换为实际密钥
const API_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

// 创建axios实例
const deepseekApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
  }
});

// 随机场景列表，增加谜题多样性
const RANDOM_SCENARIOS = [
  "医院", "学校", "办公室", "森林", "海边", "太空站",
  "古寺庙", "未来城市", "火车上", "沙漠", "海底", "雪山"
];

/**
 * 获取随机场景提示
 */
const getRandomScenario = () => {
  const randomIndex = Math.floor(Math.random() * RANDOM_SCENARIOS.length);
  return RANDOM_SCENARIOS[randomIndex];
};

/**
 * 调用DeepSeek API生成海龟汤谜题和汤底
 * @returns {Promise<{puzzle: string, answer: string, conditions: string[]}>} 包含谜题、汤底和核心条件的对象
 */
export const generatePuzzle = async () => {
  try {
    // 获取随机场景
    const randomScenario = getRandomScenario();
    
    const response = await deepseekApi.post('', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一个海龟汤游戏主持人。请生成一个包含多个核心条件的海龟汤谜题，格式必须严格遵循：
1. 首先输出"谜题："，然后是谜题描述
2. 然后输出"核心条件："，列出3-5个解开谜题必须满足的关键条件，用数字编号
3. 最后输出"汤底："，然后是完整答案。
不要添加任何额外内容或解释。`
        },
        {
          role: 'user',
          content: `请生成一个发生在${randomScenario}场景的海龟汤谜题，确保包含3-5个核心条件。`
        }
      ],
      max_tokens: 500,
      temperature: 1.1,
      top_p: 0.9
    });
    
    const content = response.data.choices[0].message.content;
    console.log('生成谜题原始响应:', content);
    
    // 解析谜题、核心条件和汤底
    const puzzleMatch = content.match(/谜题：([\s\S]*?)核心条件：/);
    const conditionsMatch = content.match(/核心条件：([\s\S]*?)汤底：/);
    const answerMatch = content.match(/汤底：([\s\S]*)/);
    
    if (!puzzleMatch || !conditionsMatch || !answerMatch) {
      throw new Error('无法解析谜题格式，缺少必要部分');
    }
    
    // 提取核心条件列表
    const conditions = conditionsMatch[1]
      .split(/\d+\./)
      .filter(item => item.trim())
      .map(item => item.trim());
    
    const puzzle = puzzleMatch[1].trim();
    const answer = answerMatch[1].trim();
    
    console.log('解析结果 - 谜题:', puzzle);
    console.log('解析结果 - 核心条件:', conditions);
    console.log('解析结果 - 汤底:', answer);
    
    return { puzzle, answer, conditions };
  } catch (error) {
    console.error('生成谜题失败:', error.response?.data || error.message);
    throw new Error('无法生成谜题，请稍后重试');
  }
};

/**
 * 向DeepSeek API发送用户问题并获取回答
 * @param {string} puzzle 当前谜题
 * @param {string} soupBase 汤底答案
 * @param {string[]} conditions 核心条件列表
 * @param {Array} chatHistory 对话历史（确保是数组）
 * @param {string} question 用户当前问题
 * @returns {Promise<{answer: string, isCorrect: boolean}>} AI回答、是否完全正确
 */
export const askQuestion = async (puzzle, soupBase, conditions, chatHistory, question) => {
  // 确保chatHistory是数组
  const safeChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
  
  // 构建对话历史消息
  const messages = [
    {
      role: 'system',
      content: `你是一个海龟汤游戏主持人。根据以下谜题情境和汤底，回答用户的问题：
      
      谜题情境: ${puzzle}
      汤底答案: ${soupBase}
      
      回答规则:
      1. 只根据汤底答案判断用户问题的正确性
      2. 如果用户的问题与汤底一致，回答"是"
      3. 如果用户的问题与汤底矛盾，回答"否"
      4. 如果问题与汤底无关或无法判断，回答"无法回答"
      5. 只返回"是"、"否"或"无法回答"，不要有任何多余文字
      6. 如果用户完全猜中了汤底，回答格式："[完全正确]恭喜你完全猜对了！"，不要包含汤底内容`
    }
  ];
  
  // 添加对话历史（确保是数组且只包含有效消息）
  safeChatHistory.forEach(item => {
    if (item && typeof item === 'object' && item.role && item.content) {
      messages.push({ 
        role: item.role, 
        content: item.content 
      });
    }
  });
  
  // 添加当前问题
  messages.push({ role: 'user', content: question });
  
  try {
    const response = await deepseekApi.post('', {
      model: 'deepseek-chat',
      messages: messages,
      max_tokens: 50,
      temperature: 0.5,
      top_p: 0.7
    });
    
    const answer = response.data.choices[0].message.content.trim();
    console.log('API原始响应:', answer);
    
    // 判断是否完全正确
    if (answer.startsWith('[完全正确]')) {
      return {
        answer: '是', // 只返回"是"，不展示额外信息
        isCorrect: true
      };
    } else {
      // 确保只返回允许的回答
      const validAnswers = ['是', '否', '无法回答'];
      const cleanAnswer = validAnswers.includes(answer) ? answer : '无法回答';
      
      return {
        answer: cleanAnswer,
        isCorrect: false
      };
    }
  } catch (error) {
    console.error('提问失败:', error.response?.data || error.message);
    console.error('请求参数:', JSON.stringify(messages, null, 2));
    throw new Error('无法获取回答，请稍后重试');
  }
};

export default deepseekApi;