import logo from './logo.svg';
import './App.css';

import WebDocker from "react-webdocker"

import { Nav } from "./Nav.js"
import { Hero } from "./Hero.js"

function App() {
  return (
    <div className="App">
      <Nav />
      <main>
        <Hero />
        <WebDocker />
      </main>
    </div>
  );
}

export default App;
