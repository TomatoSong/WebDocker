import logo from './logo.svg';
import './App.css';

import WebDocker from "react-webdocker"

import { Nav } from "./Nav.js"

function App() {
  return (
    <div className="App">
      <Nav />
      <WebDocker />
    </div>
  );
}

export default App;
