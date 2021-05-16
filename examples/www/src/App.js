import logo from './logo.svg';
import './App.css';

import WebDocker from 'react-webdocker';

import { Nav } from './Nav.js';
import { Hero } from './Hero.js';
import { Values } from './Values.js';
import Footer from './Footer.js';

function App() {
    return (
        <div className="App">
            <Nav />
            <main>
                <Hero />
                <Values />
                <WebDocker />
            </main>
            <Footer />
        </div>
    );
}

export default App;
