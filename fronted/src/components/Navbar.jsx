import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faUser, faTrafficLight } from '@fortawesome/free-solid-svg-icons'


const Navbar = () => {
  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '30px 30px', 
      backgroundColor: '#ffd655', 
      color: 'black'
    }}>

     {/* <FontAwesomeIcon 
        icon={faTrafficLight} 
        style={{ fontSize: '28px', marginRight: '10px' }} 
      /> */}

      <div>
        <box-icon type="solid" name="traffic" style={{ fontSize: '28px' }} className="nav-icon"></box-icon>
      </div>


     <h1 style={{ 
        margin: 0, 
        fontSize: '24px', 
        textAlign: 'center', 
        fontFamily: '"Tektur", sans-serif',
        fontWeight: 900,
        flex: 1 
      }}>
        🚦Smart Traffic System 🚦
      </h1>
    
      <ul style={{ 
        listStyle: 'none', 
        display: 'flex', 
        gap: '27px', 
        margin: 0, 
        padding: 0, 
        marginLeft: 'auto',
      }}>
        <li  className="nav-icon">
          <FontAwesomeIcon 
            icon={faMagnifyingGlass} 
            style={{ fontSize: '20px', cursor: 'pointer' }} 
          />
        </li>
        <li className="nav-icon">
          <FontAwesomeIcon 
            icon={faUser} 
            style={{ fontSize: '20px', cursor: 'pointer' }} 
          />
        </li>
      </ul>
      <style>
        {`
          .nav-icon {
            transition: transform 0.2s ease-in-out, color 0.2s ease-in-out;
          }
          .nav-icon:hover {
            transform: scale(1.2);
            color: #333;
          }
        `}
      </style>
    </nav>
  );
};

export default Navbar;
