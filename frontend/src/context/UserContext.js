import React, { createContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [guestId, setGuestId] = useState(null);

  useEffect(() => {
    const storedGuestId = localStorage.getItem('guestId');
    if (!storedGuestId) {
      const newGuestId = uuidv4();
      localStorage.setItem('guestId', newGuestId);
      setGuestId(newGuestId);
    } else {
      setGuestId(storedGuestId);
    }
  }, []);

  return (
    <UserContext.Provider value={{ guestId }}>
      {children}
    </UserContext.Provider>
  );
};
