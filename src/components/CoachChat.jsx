import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { formatTimestamp } from '../utils/dates';
import Dialog from './Dialog';
import './AccountIntegration.css';

export default function CoachChat({
  user,
  revision,
  onRiskRefresh,
  onSettings,
}) {
  const [conversations, setConversations] = useState([]);
  const [listStatus, setListStatus] = useState('loading');
  const [listError, setListError] = useState('');
  const [listRevision, setListRevision] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState('idle');
  const [detailError, setDetailError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [temporary, setTemporary] = useState(null);
  const [received, setReceived] = useState(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [mode, setMode] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const controllers = useRef(new Set());
  const selection = useRef(0);
  const sendController = useRef(null);
  useEffect(() => {
    const pendingControllers = controllers.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      pendingControllers.forEach((controller) => controller.abort());
    };
  }, []);
  useEffect(() => {
    if (!user.ai_enabled) sendController.current?.abort();
  }, [user.ai_enabled]);
  const request = async (path, options = {}) => {
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      return await api(path, { ...options, signal: controller.signal });
    } finally {
      controllers.current.delete(controller);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    setListStatus((current) =>
      current === 'ready' ? 'refreshing' : 'loading'
    );
    setListError('');
    api('/api/coach/conversations', { signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted) {
          setConversations(items);
          setListStatus('ready');
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setListError(error.message);
          setListStatus('error');
        }
      });
    return () => controller.abort();
  }, [user.id, revision, listRevision]);

  const readConversation = async (id) => {
    if (lock.current) return;
    const requestNumber = ++selection.current;
    setSelectedId(id);
    setDetail(null);
    setDetailStatus('loading');
    setDetailError('');
    setSendError('');
    setTemporary(null);
    setReceived(null);
    setMode(null);
    setNeedsReload(false);
    try {
      const result = await request(
        `/api/coach/conversations/${encodeURIComponent(id)}`
      );
      if (!mounted.current || requestNumber !== selection.current) return;
      setDetail(result);
      setDetailStatus('ready');
    } catch (error) {
      if (
        !mounted.current ||
        requestNumber !== selection.current ||
        error.name === 'AbortError'
      )
        return;
      setDetailError(error.message);
      setDetailStatus('error');
      if (error.status === 404) {
        setSelectedId(null);
        setListRevision((value) => value + 1);
      }
    }
  };
  const newConversation = () => {
    if (lock.current) return;
    selection.current += 1;
    setSelectedId(null);
    setDetail(null);
    setDetailStatus('idle');
    setDetailError('');
    setSendError('');
    setTemporary(null);
    setReceived(null);
    setMode(null);
    setNeedsReload(false);
    setDraft('');
  };
  const send = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (
      lock.current ||
      !user.ai_enabled ||
      !message ||
      message.length > 1000 ||
      needsReload
    )
      return;
    lock.current = true;
    setSending(true);
    setSendError('');
    setTemporary(message);
    setReceived(null);
    let saved = false;
    const controller = new AbortController();
    sendController.current = controller;
    controllers.current.add(controller);
    try {
      const body = selectedId
        ? { conversation_id: selectedId, message }
        : { message };
      const result = await api('/api/coach/chat', {
        method: 'POST',
        body,
        signal: controller.signal,
      });
      saved = true;
      if (!mounted.current || controller.signal.aborted) return;
      setSelectedId(result.conversation_id);
      setMode(result.mode);
      setReceived(result.message);
      setDraft('');
      setNeedsReload(true);
      setListRevision((value) => value + 1);
      onRiskRefresh?.();
      const complete = await api(
        `/api/coach/conversations/${encodeURIComponent(result.conversation_id)}`,
        { signal: controller.signal }
      );
      if (!mounted.current || controller.signal.aborted) return;
      setDetail(complete);
      setDetailStatus('ready');
      setTemporary(null);
      setReceived(null);
      setNeedsReload(false);
    } catch (error) {
      if (!mounted.current) return;
      if (saved)
        setSendError(
          'Your message was saved, but the saved conversation could not be reloaded. Reload messages before sending again.'
        );
      else {
        setTemporary(null);
        setSendError(
          `${error.name === 'AbortError' ? 'Sending was interrupted.' : error.message}${!error.status || error.status >= 500 ? ' The message may have been saved. Check saved conversations before retrying; a retry can create duplicate messages.' : ''}`
        );
      }
    } finally {
      controllers.current.delete(controller);
      sendController.current = null;
      lock.current = false;
      if (mounted.current) setSending(false);
    }
  };
  const deleteConversation = async () => {
    if (lock.current || !selectedId) return;
    lock.current = true;
    setDeleting(true);
    setDetailError('');
    try {
      await request(
        `/api/coach/conversations/${encodeURIComponent(selectedId)}`,
        { method: 'DELETE' }
      );
      if (!mounted.current) return;
      lock.current = false;
      setConfirmDelete(false);
      newConversation();
      setListRevision((value) => value + 1);
    } catch (error) {
      if (mounted.current && error.name !== 'AbortError') {
        setDetailError(error.message);
        if (error.status === 404) {
          lock.current = false;
          setConfirmDelete(false);
          newConversation();
          setListRevision((value) => value + 1);
        }
      }
    } finally {
      lock.current = false;
      if (mounted.current) setDeleting(false);
    }
  };
  const renderMessage = (message) => (
    <article
      className={`coach-message coach-message-${message.role}`}
      key={message.id}
    >
      <header>
        <strong>{message.role === 'user' ? 'You' : 'Coach'}</strong>
        <time dateTime={message.created_at}>
          {formatTimestamp(message.created_at, user.timezone)}
        </time>
      </header>
      <p>{message.content}</p>
      {message.sources?.length > 0 && (
        <div className="coach-sources">
          <strong>Sources</strong>
          <ul>
            {message.sources.map((source) => (
              <li key={source.id}>{source.title}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
  return (
    <div className="stack">
      <div className="privacy-note coach-preview">
        <strong>Coach preview · setup pending</strong>
        <p>
          The coach currently saves placeholder replies. Personalized AI coaching
          and source retrieval are not connected. Saved
          messages reflect the context when they were written and are not
          current risk reports. A reassuring coach reply does not verify that
          risk prediction is available.
        </p>
        {mode && mode !== 'placeholder' && (
          <p>
            Latest server reply mode:{' '}
            {mode === 'llm' ? 'LLM' : 'Retrieval only'}.
          </p>
        )}
      </div>
      <div className="coach-layout">
        <aside
          className="panel coach-conversations"
          aria-labelledby="conversation-title"
        >
          <h2 className="section-title" id="conversation-title">
            Saved conversations
          </h2>
          <button
            className="btn btn-secondary"
            disabled={sending || deleting}
            onClick={newConversation}
          >
            New conversation
          </button>
          {listStatus === 'loading' && (
            <p className="status-note" role="status">
              Loading conversations…
            </p>
          )}
          {listError && (
            <div className="status-note status-error" role="alert">
              <p>{listError}</p>
              <button
                className="btn btn-secondary"
                onClick={() => setListRevision((value) => value + 1)}
              >
                Retry conversations
              </button>
            </div>
          )}
          {listStatus === 'ready' && !conversations.length && (
            <p className="status-note">No saved conversations yet.</p>
          )}
          <ul className="coach-list">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  aria-pressed={selectedId === conversation.id}
                  disabled={sending || deleting}
                  onClick={() => readConversation(conversation.id)}
                >
                  {conversation.title}
                  <small>
                    {formatTimestamp(conversation.updated_at, user.timezone)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section
          className="panel coach-thread"
          aria-labelledby="coach-thread-title"
        >
          <div className="coach-heading">
            <h2 className="section-title" id="coach-thread-title">
              {detail?.title || 'New conversation'}
            </h2>
            {selectedId && (
              <button
                className="btn btn-danger"
                disabled={sending || deleting}
                onClick={() => setConfirmDelete(true)}
              >
                Delete conversation
              </button>
            )}
          </div>
          {!user.ai_enabled && (
            <div className="status-note">
              <strong>AI is disabled</strong>
              <p>
                You can read and delete saved conversations. Enable AI in
                Settings to send new messages.
              </p>
              <button className="btn btn-secondary" onClick={onSettings}>
                Open Settings
              </button>
            </div>
          )}
          {detailStatus === 'loading' && (
            <p className="status-note" role="status">
              Loading saved messages…
            </p>
          )}
          {detailError && (
            <div className="status-note status-error" role="alert">
              <p>{detailError}</p>
              {selectedId && (
                <button
                  className="btn btn-secondary"
                  onClick={() => readConversation(selectedId)}
                >
                  Retry messages
                </button>
              )}
            </div>
          )}
          <div className="coach-messages" aria-live="polite">
            {detail?.messages.map(renderMessage)}
            {temporary && (
              <article className="coach-message coach-message-user">
                <header>
                  <strong>
                    You · {sending ? 'sending' : 'awaiting reconciliation'}
                  </strong>
                </header>
                <p>{temporary}</p>
              </article>
            )}
            {received && renderMessage(received)}
            {sending && (
              <p role="status" className="muted">
                Waiting for the coach preview…
              </p>
            )}
          </div>
          {sendError && (
            <p className="status-note status-error" role="alert">
              {sendError}
            </p>
          )}
          {needsReload && selectedId && !sending && (
            <button
              className="btn btn-secondary"
              onClick={() => readConversation(selectedId)}
            >
              Reload saved messages
            </button>
          )}
          <form className="coach-composer" onSubmit={send} aria-busy={sending}>
            <label className="field-label" htmlFor="coach-message">
              Message the coach preview
            </label>
            <textarea
              id="coach-message"
              className="input"
              rows={4}
              required
              maxLength={1000}
              aria-describedby="coach-message-hint"
              value={draft}
              disabled={
                !user.ai_enabled ||
                sending ||
                deleting ||
                needsReload ||
                detailStatus === 'loading' ||
                detailStatus === 'error'
              }
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your habits…"
            />
            <p className="form-hint" id="coach-message-hint">
              {draft.length}/1000 characters. Messages are sent once; failed
              sends require your deliberate retry.
            </p>
            <button
              className="btn btn-primary"
              disabled={
                !user.ai_enabled ||
                sending ||
                deleting ||
                needsReload ||
                !draft.trim() ||
                detailStatus === 'loading' ||
                detailStatus === 'error'
              }
            >
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </section>
      </div>
      <Dialog
        open={confirmDelete}
        onClose={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        title="Delete this conversation?"
        description="This permanently deletes the conversation and all of its saved messages."
      >
        {detailError && (
          <p role="alert" className="status-note status-error">
            {detailError}
          </p>
        )}
        <div className="dialog-actions">
          <button
            data-autofocus
            className="btn btn-secondary"
            disabled={deleting}
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            disabled={deleting}
            onClick={deleteConversation}
          >
            {deleting ? 'Deleting…' : 'Permanently delete conversation'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
