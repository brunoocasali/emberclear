import Message, { TARGET } from './model';

export function selectUnreadDirectMessages(messages: Message[], fromId: string) {
  const filtered = messages.filter(m => {
    return (
      m.from === fromId
      && m.unread
      && m.target !== TARGET.NONE
      && m.target !== TARGET.MESSAGE
    );
  });

  return filtered;
}
