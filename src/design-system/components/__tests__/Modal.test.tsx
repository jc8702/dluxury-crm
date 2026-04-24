import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('renderiza quando isOpen é true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Teste Modal">
        <p>Conteúdo do modal</p>
      </Modal>
    );
    expect(screen.getByText('Teste Modal')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument();
  });

  it('não renderiza quando isOpen é false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Teste Modal">
        <p>Conteúdo do modal</p>
      </Modal>
    );
    expect(screen.queryByText('Teste Modal')).not.toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão de fechar', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Teste Modal">
        <p>Conteúdo</p>
      </Modal>
    );
    
    fireEvent.click(screen.getByLabelText('Fechar modal'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no overlay (container) mas não no conteúdo', async () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen={true} onClose={handleClose} title="Teste Modal" closeOnOverlayClick={true}>
        <p>Inner Content</p>
      </Modal>
    );
    
    // Clicar no container (overlay) deve fechar
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(handleClose).toHaveBeenCalledTimes(1);
    
    // Renderizar novamente para testar clique no conteúdo
    rerender(
      <Modal isOpen={true} onClose={handleClose} title="Teste Modal" closeOnOverlayClick={true}>
        <p>Inner Content 2</p>
      </Modal>
    );
    
    const content = screen.getByText('Inner Content 2');
    fireEvent.click(content);
    expect(handleClose).toHaveBeenCalledTimes(1); // Still 1, não mudou porque stopPropagation
  });

  it('fecha ao pressionar ESC', async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Teste Modal">
        <p>Conteúdo</p>
      </Modal>
    );
    
    await userEvent.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});