// スクリプトプロパティからAPIキーとLINEアクセストークンを取得
const scriptProperties = PropertiesService.getScriptProperties();
const DIFY_API_KEY = scriptProperties.getProperty('DIFY_API_KEY');
const LINE_ACCESS_TOKEN = scriptProperties.getProperty('LINE_ACCESS_TOKEN');
const SPREADSHEET_ID = scriptProperties.getProperty('SPREADSHEET_ID');

// ボットの性格を設定
const BOT_PERSONALITY = "ここにプロンプトを入れる";

// スプレッドシートのシートオブジェクトを取得
const conversationLogSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('会話ログ');

// doPost関数：LINEからのPOSTリクエストを処理
function doPost(e) {
  try {
    Logger.log(`Event data: ${JSON.stringify(e)}`);
    if (!e.postData) {
      throw new Error("No post data received");
    }

    const events = JSON.parse(e.postData.contents).events;
    events.forEach(handleEvent);

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(error);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}


// イベントハンドラ
function handleEvent(event) {
  const replyToken = event.replyToken;
  const userId = event.source.userId;
  const userMessage = event.message.text;

  const replyMessage = getReplyMessage(userId, userMessage);
  Logger.log(`Reply message: ${replyMessage}`);
  replyToUser(replyToken, replyMessage);

  // 会話履歴とログの記録
  recordConversation(userId, 'user', userMessage);
  recordConversation(userId, 'assistant', replyMessage);
}


// 会話履歴とログを記録する関数
function recordConversation(userId, role, message) {
  // 会話履歴の更新
  updateConversationHistory(userId, { role, content: message });

  // 会話ログの記録
  logConversation(userId, role, message);
}


// 会話履歴の更新
function updateConversationHistory(userId, message) {
  let history = getConversationHistory(userId);
  history.push(message);
  if (history.length > 10) { 
    history.shift(); 
  }
  PropertiesService.getUserProperties().setProperty(userId, JSON.stringify(history));
}


// 会話履歴を取得
function getConversationHistory(userId) {
  const history = PropertiesService.getUserProperties().getProperty(userId);
  return history ? JSON.parse(history) : [];
}


// 会話ログをスプレッドシートに記録
function logConversation(userId, role, message) {
  const timestamp = new Date();
  const userName = getUserProfile(userId); 
  conversationLogSheet.appendRow([timestamp, userId, userName, role, message]); 
}


// スプレッドシートからの回答を取得し、LLMに渡して最終回答を生成
function getReplyMessage(userId, userMessage) {
  Logger.log(`Fetching reply for message: ${userMessage}`);

  // 会話履歴を取得
  const conversationHistory = getConversationHistory(userId);

  // Dify API 呼び出し用のパラメータ設定
  const difyParams = {
    inputs: {}, 
    query: userMessage, 
    response_mode: "blocking", 
    conversation_id: conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].conversation_id : "",
    user: userId,
    auto_generate_name: true 
  };

  // Dify API 呼び出し
  return getReplyMessageFromDify(conversationHistory, difyParams);
}


// Difyモデルからの回答を取得
function getReplyMessageFromDify(conversationHistory, difyParams) {
  Logger.log(`Fetching Dify response for params: ${JSON.stringify(difyParams)}`);

  const messages = [
    { role: 'system', content: BOT_PERSONALITY },
    ...conversationHistory,
    { role: 'user', content: difyParams.query }
  ];

  const url = `APIエンドポイント`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + DIFY_API_KEY,
  };
  const postData = {
    messages: messages,
    max_tokens: 3000,
    ...difyParams
  };

  const options = {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(postData)
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  Logger.log(`Dify Response: ${JSON.stringify(json)}`);

  // 会話IDの更新
  updateConversationId(difyParams.user, json.conversation_id);

  return json.answer.trim();
}


// 会話IDを更新
function updateConversationId(userId, conversationId) {
  const history = getConversationHistory(userId);
  if (history.length > 0) {
    history[history.length - 1].conversation_id = conversationId;
    PropertiesService.getUserProperties().setProperty(userId, JSON.stringify(history));
  }
}


// ユーザーに返信
function replyToUser(replyToken, message) {
  Logger.log(`Sending reply to user: ${message}`);
  const url = 'https://api.line.me/v2/bot/message/reply';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN
  };
  const postData = {
    replyToken: replyToken,
    messages: [{
      type: 'text',
      text: message
    }]
  };

  const options = {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(postData)
  };

  UrlFetchApp.fetch(url, options); 
}

// ユーザーのプロフィール情報を取得
function getUserProfile(userId) {
  const url = `https://api.line.me/v2/bot/profile/${userId}`;
  const headers = {
    'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
  };
  const options = {
    method: 'get',
    headers: headers,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const profile = JSON.parse(response.getContentText());
    return profile.displayName; 
  } catch (error) {
    Logger.log(`Error getting user profile: ${error}`);
    return null; 
  }
}
