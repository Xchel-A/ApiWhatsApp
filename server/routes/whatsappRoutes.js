const express = require('express');
const { body, validationResult } = require('express-validator');
const {
    initializeClient, generateQR, sendMessage, checkSession,
    getChats, getContacts, getChatById, getChatMessages,
    sendMedia, getProfilePicUrl, getState, logout,
    sendMessageWithButtons, getBatteryLevel, blockContact,
    unblockContact, getContactStatus, setStatus, getClientState,
    addParticipant, removeParticipant, promoteParticipant,
    demoteParticipant, createGroup, getInviteInfo, acceptInvite,
    archiveChat, unarchiveChat, muteChat, unmuteChat,
    deleteMessage, markMessageAsRead, replyToMessage,
    getCommonGroups, markChatAsRead, downloadMedia,
    getMessageInfo, getCurrentQRCode, getGroupAdmins,
    changeGroupName, changeGroupDescription, getGroupParticipants,
    sendLocation, changeProfilePic, pinMessage, unpinMessage,
    getLastSeen, changeContactName, sendFile, getGroupProfilePic,
    getStarredMessages, getContactGroups, getContactProfilePic,
    pinChat, unpinChat, deleteChat, muteContact,
    getMessagesFromConversation, getUnreadMessages, getStarredMessagesFromContact,
    getLabels, getLabelById, getBusinessProfile,
    getLabelsByChatId, removeLabelFromChat, sendMessageToGroup,
    sendContactCard, clearChat, changeGroupSettings,
    sendListMessage, getBlockedContacts, setGroupAnnouncement,
    getChatLabels, getMuteStatus, sendTemplateMessage,
    getChatMuteDuration, updateProfileName, createBroadcastList,
    getGroupMetadata, sendReaction, removeReaction
} = require('../controllers/whatsappController');

const router = express.Router();

router.post('/initialize', [
    body('token').not().isEmpty().withMessage('Token is required')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    initializeClient(req.body.token).then(result => {
        res.status(result.isLoggedIn ? 200 : result.message.includes('Invalid token') ? 401 : 500).json(result);
    }).catch(next);
});

router.post('/generate-qr', [
    body('token').not().isEmpty().withMessage('Token is required')
], generateQR);

router.post('/send-message', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('mensaje').not().isEmpty().withMessage('Message is required')
], sendMessage);

router.post('/check-session', [
    body('token').not().isEmpty().withMessage('Token is required')
], checkSession);

router.post('/get-chats', [
    body('token').not().isEmpty().withMessage('Token is required')
], getChats);

router.post('/get-contacts', [
    body('token').not().isEmpty().withMessage('Token is required')
], getContacts);

router.post('/get-chat-by-id', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getChatById);

router.post('/get-chat-messages', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getChatMessages);

router.post('/send-media', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('mediaUrl').not().isEmpty().withMessage('Media URL is required')
], sendMedia);

router.post('/get-profile-pic-url', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], getProfilePicUrl);

router.post('/get-state', [
    body('token').not().isEmpty().withMessage('Token is required')
], getState);

router.post('/logout', [
    body('token').not().isEmpty().withMessage('Token is required')
], logout);

router.post('/send-message-with-buttons', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('mensaje').not().isEmpty().withMessage('Message is required'),
    body('botones').isArray().withMessage('Buttons must be an array')
], sendMessageWithButtons);

router.post('/get-battery-level', [
    body('token').not().isEmpty().withMessage('Token is required')
], getBatteryLevel);

router.post('/block-contact', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], blockContact);

router.post('/unblock-contact', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], unblockContact);

router.post('/get-contact-status', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], getContactStatus);

router.post('/set-status', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('status').not().isEmpty().withMessage('Status is required')
], setStatus);

router.post('/get-client-state', [
    body('token').not().isEmpty().withMessage('Token is required')
], getClientState);

router.post('/add-participant', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required'),
    body('participantId').not().isEmpty().withMessage('Participant ID is required')
], addParticipant);

router.post('/remove-participant', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required'),
    body('participantId').not().isEmpty().withMessage('Participant ID is required')
], removeParticipant);

router.post('/promote-participant', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required'),
    body('participantId').not().isEmpty().withMessage('Participant ID is required')
], promoteParticipant);

router.post('/demote-participant', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required'),
    body('participantId').not().isEmpty().withMessage('Participant ID is required')
], demoteParticipant);

router.post('/create-group', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupName').not().isEmpty().withMessage('Group name is required'),
    body('participants').isArray().withMessage('Participants must be an array')
], createGroup);

router.post('/get-invite-info', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('inviteCode').not().isEmpty().withMessage('Invite code is required')
], getInviteInfo);

router.post('/accept-invite', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('inviteCode').not().isEmpty().withMessage('Invite code is required')
], acceptInvite);

router.post('/archive-chat', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], archiveChat);

router.post('/unarchive-chat', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], unarchiveChat);

router.post('/mute-chat', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required'),
    body('duration').not().isEmpty().withMessage('Duration is required')
], muteChat);

router.post('/unmute-chat', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], unmuteChat);

router.post('/delete-message', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('messageId').not().isEmpty().withMessage('Message ID is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], deleteMessage);

router.post('/mark-message-as-read', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('messageId').not().isEmpty().withMessage('Message ID is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], markMessageAsRead);

router.post('/reply-to-message', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('messageId').not().isEmpty().withMessage('Message ID is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required'),
    body('replyMessage').not().isEmpty().withMessage('Reply message is required')
], replyToMessage);

router.post('/get-common-groups', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], getCommonGroups);

router.post('/mark-chat-as-read', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], markChatAsRead);

router.post('/download-media', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('messageId').not().isEmpty().withMessage('Message ID is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], downloadMedia);

router.post('/get-message-info', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('messageId').not().isEmpty().withMessage('Message ID is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getMessageInfo);

router.post('/get-current-qr-code', [
    body('token').not().isEmpty().withMessage('Token is required')
], getCurrentQRCode);

router.post('/get-group-admins', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required')
], getGroupAdmins);

router.post('/change-group-name', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required'),
    body('newName').not().isEmpty().withMessage('New name is required')
], changeGroupName);

router.post('/change-group-description', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required'),
    body('newDescription').not().isEmpty().withMessage('New description is required')
], changeGroupDescription);

router.post('/get-group-participants', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required')
], getGroupParticipants);

router.post('/send-location', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('latitude').not().isEmpty().withMessage('Latitude is required'),
    body('longitude').not().isEmpty().withMessage('Longitude is required'),
    body('description').not().isEmpty().withMessage('Description is required')
], sendLocation);

router.post('/change-profile-pic', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('imageUrl').not().isEmpty().withMessage('Image URL is required')
], changeProfilePic);

router.post('/pin-message', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required'),
    body('messageId').not().isEmpty().withMessage('Message ID is required')
], pinMessage);

router.post('/unpin-message', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required'),
    body('messageId').not().isEmpty().withMessage('Message ID is required')
], unpinMessage);

router.post('/get-last-seen', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], getLastSeen);

router.post('/change-contact-name', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('newName').not().isEmpty().withMessage('New name is required')
], changeContactName);

router.post('/send-file', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('filePath').not().isEmpty().withMessage('File path is required'),
    body('caption').optional().isString()
], sendFile);

router.post('/get-group-profile-pic', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required')
], getGroupProfilePic);

router.post('/get-starred-messages', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getStarredMessages);

router.post('/get-contact-groups', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], getContactGroups);

router.post('/get-contact-profile-pic', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], getContactProfilePic);

router.post('/pin-chat', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], pinChat);

router.post('/unpin-chat', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], unpinChat);

router.post('/delete-chat', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], deleteChat);

router.post('/mute-contact', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('duration').not().isEmpty().withMessage('Duration is required')
], muteContact);

router.post('/get-messages-from-conversation', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required'),
    body('limit').isInt({ gt: 0 }).withMessage('Limit must be a positive integer')
], getMessagesFromConversation);

router.post('/get-unread-messages', [
    body('token').not().isEmpty().withMessage('Token is required')
], getUnreadMessages);

router.post('/get-starred-messages-from-contact', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required')
], getStarredMessagesFromContact);

router.post('/get-labels', [
    body('token').not().isEmpty().withMessage('Token is required')
], getLabels);

router.post('/get-label-by-id', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('labelId').not().isEmpty().withMessage('Label ID is required')
], getLabelById);

router.post('/get-business-profile', [
    body('token').not().isEmpty().withMessage('Token is required')
], getBusinessProfile);

router.post('/get-labels-by-chat-id', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getLabelsByChatId);

router.post('/remove-label-from-chat', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required'),
    body('labelId').not().isEmpty().withMessage('Label ID is required')
], removeLabelFromChat);

router.post('/send-message-to-group', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required'),
    body('mensaje').not().isEmpty().withMessage('Message is required')
], sendMessageToGroup);

router.post('/send-contact-card', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('contactId').not().isEmpty().withMessage('Contact ID is required')
], sendContactCard);

router.post('/clear-chat', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], clearChat);

router.post('/change-group-settings', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required'),
    body('settings').not().isEmpty().withMessage('Settings are required')
], changeGroupSettings);

router.post('/send-list-message', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('message').not().isEmpty().withMessage('Message is required'),
    body('sections').isArray().withMessage('Sections must be an array')
], sendListMessage);

router.post('/send-template-message', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('numero').not().isEmpty().withMessage('Number is required'),
    body('templateId').not().isEmpty().withMessage('Template ID is required'),
    body('variables').isArray().withMessage('Variables must be an array')
], sendTemplateMessage);

router.post('/get-blocked-contacts', [
    body('token').not().isEmpty().withMessage('Token is required')
], getBlockedContacts);

router.post('/set-group-announcement', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required'),
    body('announcement').isBoolean().withMessage('Announcement must be a boolean')
], setGroupAnnouncement);

router.post('/get-chat-labels', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getChatLabels);

router.post('/get-mute-status', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getMuteStatus);

// New routes with validations
router.post('/get-chat-mute-duration', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('chatId').not().isEmpty().withMessage('Chat ID is required')
], getChatMuteDuration);

router.post('/update-profile-name', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('name').not().isEmpty().withMessage('Name is required')
], updateProfileName);

router.post('/create-broadcast-list', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('recipients').isArray().withMessage('Recipients must be an array')
], createBroadcastList);

router.post('/get-group-metadata', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('groupId').not().isEmpty().withMessage('Group ID is required')
], getGroupMetadata);

router.post('/send-reaction', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('messageId').not().isEmpty().withMessage('Message ID is required'),
    body('emoji').not().isEmpty().withMessage('Emoji is required')
], sendReaction);

router.post('/remove-reaction', [
    body('token').not().isEmpty().withMessage('Token is required'),
    body('messageId').not().isEmpty().withMessage('Message ID is required')
], removeReaction);

module.exports = router;
