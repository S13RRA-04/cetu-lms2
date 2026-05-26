import Modal from './Modal.jsx';

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, danger = true }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
