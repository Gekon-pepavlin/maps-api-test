import { useState } from 'react';
import Marker from '../lib/core/Marker';

export default function Krecek (){
    const [color, setColor] = useState("red");
  
      const onClick = () => {
        setColor(color === "red" ? "blue" : "red");        
      }
  
    return <div onClick={onClick} style={{ color: color, backgroundColor:"white", padding: 5, borderRadius: 5}}>
      <strong>Krecek</strong>
    </div>
  }