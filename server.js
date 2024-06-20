const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage for sessions and orders
const sessions = {};

// Sample menu items
const menuItems = [
  { id: 1, name: 'Burger', price: 5 },
  { id: 2, name: 'Pizza', price: 8 },
  { id: 3, name: 'Pasta', price: 7 },
  { id: 4, name: 'Salad', price: 4 }
];

// Helper function to get session
const getSession = (deviceId) => {
  if (!sessions[deviceId]) {
    sessions[deviceId] = { currentOrder: [], orderHistory: [] };
  }
  return sessions[deviceId];
};

// Socket.io connection
io.on('connection', (socket) => {
  socket.on('message', (data) => {
    const { deviceId, message } = data;

    const session = getSession(deviceId);
    const input = message.trim();

    let response = '';

    switch (input) {
      case '1':
        const menu = menuItems.map(item => `Select ${item.id} for ${item.name} - $${item.price}`).join('\n');
        response = `Menu:\n${menu}`;
        break;
      case '99':
        if (session.currentOrder.length === 0) {
          response = 'No order to place. Select 1 to place an order.';
        } else {
          session.orderHistory.push([...session.currentOrder]);
          session.currentOrder = [];
          response = 'Order placed. Select 1 to place a new order.';
        }
        break;
      case '98':
        if (session.orderHistory.length === 0) {
          response = 'No order history.';
        } else {
          const orderHistory = session.orderHistory.map((order, index) => 
            `Order ${index + 1}:\n` + order.map(item => `${item.name} - $${item.price}`).join('\n')
          ).join('\n\n');
          response = `Order History:\n${orderHistory}`;
        }
        break;
      case '97':
        if (session.currentOrder.length === 0) {
          response = 'No current order.';
        } else {
          const currentOrder = session.currentOrder.map(item => `${item.name} - $${item.price}`).join('\n');
          response = `Current Order:\n${currentOrder}`;
        }
        break;
      case '0':
        if (session.currentOrder.length === 0) {
          response = 'No order to cancel.';
        } else {
          session.currentOrder = [];
          response = 'Order canceled.';
        }
        break;
      default:
        const itemId = parseInt(input);
        const menuItem = menuItems.find(item => item.id === itemId);
        if (menuItem) {
          session.currentOrder.push(menuItem);
          response = `${menuItem.name} added to your order. Select 99 to checkout.`;
        } else {
          response = 'Invalid option. Please try again.';
        }
        break;
    }

    socket.emit('response', { message: response });
  });

  // Send initial options when a customer lands on the chatbot page
  socket.emit('response', {
    message: `Welcome to the Restaurant ChatBot!\nSelect 1 to Place an order\nSelect 99 to checkout order\nSelect 98 to see order history\nSelect 97 to see current order\nSelect 0 to cancel order`
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Restaurant ChatBot is running on http://localhost:${port}`);
});