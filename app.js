const express = require('express');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const authService = require('./services/authService');
const { Author, RequestHistory, collection, LoginSchema } = require('./models/author');
const userService = require('./services/userService');
const jwt = require('jsonwebtoken');
const Item = require('./models/item');

const app = express();

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://123:123@cluster0.yiy0oqq.mongodb.net/?retryWrites=true&w=majority')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up express-session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: true,
  saveUninitialized: true
}));

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve images from the 'images' directory
app.use('/images', express.static('images'));

// Route handler for the main page
app.get('/', (req, res) => {// Get the authenticated user from the session
  res.render('index',{message: null}); // Pass the user object to the index template
});

app.post('/login', async (req, res) => {
    const user = req.body;
    try {
        const isAdmin = await authService.login(user);
        req.session.token = jwt.sign({isAdmin}, 'my-secret-key', {expiresIn: 60 * 60});
        if(isAdmin){
            res.redirect('/admin');
        }
        else{
            // Redirect to /news/:lang page with a default language, e.g., 'eng' for English
            res.redirect('/news/eng');
        }
    }
    catch (error) {
        res.render('index', { message: error.message });
    }
});


app.get('/register', (req, res) => {
  res.render('register', { message: null });
});

app.post('/register', async (req, res) => {
  const user = req.body;
  try {
    const result = await authService.register(user);
    if(result){
      res.redirect('/');
    }
  }
  catch (error) {
    res.render('register', { message: error.message });
  }
});

app.get('/news/:lang', async (req, res) => {
    try {
        let language = req.params.lang;
        console.log(language);
        const url = `https://newsapi.org/v2/everything?q=${language === 'rus' ? 'Книга' : 'book'}&apiKey=e8574f4894984c0f9ee6e35db26600f7`;
        const response = await axios.get(url);

        const newsWithImages = response.data.articles.filter(article => article.urlToImage !== null);

        if (response.status === 200) {
            // Here, make sure you are referencing the correct EJS file, which is 'home' based on your information
            res.render('home', { news: newsWithImages }); // Change 'newsPage' to 'home'
        } else {
            res.status(response.status).json({ error: 'Failed to fetch news' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/admin', async (req,res) =>{
    try {
        const users= await userService.getUsers();
        res.render('admin', { users });
    }
    catch (error) {
        res.render('admin', { message: error.message });
    }
})
app.post('/admin/delete', async (req, res) => {
    const id = req.body.id;
    try {
        await userService.deleteUser(id);
        res.redirect('/admin');
    }
    catch (error) {
        res.redirect('/admin');
    }
})
app.post('/admin', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const isAdmin = req.body.isAdmin === 'on';
    try {
        await userService.createUser(username, password, isAdmin);
        res.redirect('/admin');
    }
    catch (error) {
        res.redirect('/admin');
    }
});

// Function to fetch books by query
async function fetchBooksBy(query, type) {
    const baseUrl = 'https://www.googleapis.com/books/v1/volumes';
    const url = `${baseUrl}?q=${type}:${encodeURIComponent(query)}&key=${'AIzaSyD9aIWif8I6m6wm61JxlGUykby9zNPub4I'}&maxResults=10`;

    try {
        const response = await axios.get(url);
        return response.data.items || [];
    } catch (error) {
        console.error('Error fetching data from Google Books API:', error.response ? error.response.data : error.message);
        throw error;
    }
}

app.get('/books/search', async (req, res) => {
    const history = await RequestHistory.find({}).sort({timestamp: -1}).limit(10);
    res.render('book', { books: [], history });
});

app.post('/books/search', async (req, res) => {
    const { fname, lname } = req.body;
    const query = `${fname} ${lname}`;
    const type = 'author';

    try {
        let author = await Author.findOne({ firstName: fname, lastName: lname });
        if (!author) {
            author = new Author({ firstName: fname, lastName: lname });
            await author.save();
        }

        let existingHistory = await RequestHistory.findOne({ searchQuery: query });
        if (!existingHistory) {
            const newHistoryEntry = new RequestHistory({ searchQuery: query });
            await newHistoryEntry.save();
        }

        const books = await fetchBooksBy(query, type);
        const history = await RequestHistory.find({}).sort({timestamp: -1}).limit(10);
        res.render('book', { books, history });
    } catch (error) {
        console.error('Error:', error);
        const history = await RequestHistory.find({}).sort({timestamp: -1}).limit(10);
        res.status(500).render('book', { error: 'Failed to process request.', books: [], history });
    }
});


app.listen(3000, () => console.log('Server started on port 3000'));
