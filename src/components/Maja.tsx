import React from 'react'

export default function Maja({count}: {count: number}) {
    const [color, setColor] = React.useState("red");

    const onClick = () => {
        setColor(color === "red" ? "blue" : "red");
    }
  return (
    <div style={{backgroundColor:"white", padding: 5, borderRadius: 5, borderColor: color, borderWidth: 5, borderStyle:"solid"}} onClick={onClick}>
        <strong>Maja</strong>{count}
    </div>
  )
}
