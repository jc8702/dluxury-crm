import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renderiza com texto', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });
  
  it('chama onClick quando clicado', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clique</Button>);
    
    fireEvent.click(screen.getByText('Clique'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('não chama onClick quando disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Clique</Button>);
    
    fireEvent.click(screen.getByText('Clique'));
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  it('mostra loading state', () => {
    render(<Button isLoading>Clique</Button>);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });
  
  it('desabilita botão quando isLoading', () => {
    render(<Button isLoading>Clique</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});