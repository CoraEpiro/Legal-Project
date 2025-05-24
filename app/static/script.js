let currentMessages = [];
let currentChatId = "chat_" + Date.now();

function addMessage(text, type) {
  const box = document.createElement('div');
  box.className = 'chat-message ' + type;
  box.textContent = text;
  document.getElementById('chatBox').appendChild(box);
  document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
}

async function askQuestion() {
  const q = document.getElementById("question").value.trim();
  if (!q) return;

  addMessage(q, "user");
  currentMessages.push({ role: "user", content: q });
  document.getElementById("question").value = "";

  addMessage("Typing...", "bot");

  const response = await fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: q, chat_id: currentChatId })
  });

  const data = await response.json();
  const lastBot = document.querySelector(".bot:last-child");
  lastBot.textContent = data.answer;
  currentMessages.push({ role: "bot", content: data.answer });
}

async function saveChat() {
  const name = document.getElementById("chatName").value.trim();
  if (!name || currentMessages.length === 0) return;

  await fetch("/api/save_chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name, chat_id: currentChatId, messages: currentMessages })
  });

  loadChatList();
}


async function loadChatList() {
  const list = document.getElementById("chatList");
  list.innerHTML = "";

  try {
    const res = await fetch("/api/chats");
    const data = await res.json();
    const chatKeys = data.chats || [];

    chatKeys.forEach(chat => {
      const wrapper = document.createElement("div");
      wrapper.className = "chat-row";  // updated class
    
      const btn = document.createElement("button");
      btn.textContent = chat.name;
      btn.className = "chat-name-btn";
      btn.onclick = () => loadChatFromServer(chat.id);
    
      const del = document.createElement("span");
      del.innerHTML = "🗑️";
      del.className = "trash-icon";
      del.title = "Delete";
      del.onclick = async () => {
        await fetch(`/api/delete_chat/${chat.id}`, { method: "DELETE" });
        loadChatList();
      };
    
      wrapper.appendChild(btn);
      wrapper.appendChild(del);
      list.appendChild(wrapper);
    });    
    
  } catch (err) {
    console.error("Failed to load chats", err);
  }
}

async function loadChatFromServer(chatId) {
  const res = await fetch(`/api/chat/${chatId}`);
  const data = await res.json();
  currentChatId = chatId;
  currentMessages = data.messages || [];

  const chatBox = document.getElementById("chatBox");
  chatBox.innerHTML = "";
  currentMessages.forEach(msg => addMessage(msg.content, msg.role === "user" ? "user" : "bot"));
}  

function loadChat(key) {
  const chatData = JSON.parse(localStorage.getItem(key));
  currentChatId = chatData.id;
  currentMessages = chatData.messages;
  const chatBox = document.getElementById("chatBox");
  chatBox.innerHTML = "";
  currentMessages.forEach(msg => addMessage(msg.content, msg.role === "user" ? "user" : "bot"));
}

function newChat() {
  currentMessages = [];
  currentChatId = "chat_" + Date.now();
  document.getElementById("chatBox").innerHTML = "";
  document.getElementById("question").value = "";
  document.getElementById("chatName").value = "";
}

loadChatList();