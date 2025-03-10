import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';

const Header = () => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="App-header">
      <Container>
        <Navbar.Brand href="#home">
          <i className="fas fa-database me-2"></i>
          SPARQL Analytics
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-between">
          <Nav className="me-auto">
            <Nav.Link href="https://sparqlquerier.netlify.app/">Home</Nav.Link>
          </Nav>
          <div className="d-flex align-items-center">
            <Navbar.Text className="me-3 d-none d-md-block">
              A modern tool for semantic data analysis
            </Navbar.Text>
            <Button 
              variant="outline-light" 
              size="sm" 
              className="d-none d-md-block"
              href="https://github.com/Darosaot/sparql_querier/tree/main"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
