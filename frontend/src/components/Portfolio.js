// frontend/src/components/Portfolio.js
import React from 'react';
import { useParams } from 'react-router-dom';

export default function Portfolio() {
  const { portfolioId } = useParams();

  return (
    <div>
      <h1>Portfolio Page</h1>
      <p>Displaying portfolio with ID: {portfolioId}</p>
      {/* Portfolio content will go here */}
    </div>
  );
}
