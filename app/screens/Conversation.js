import { useMemo, useState, useEffect, useRef } from "react";
import { useActiveConversation } from "../context/ConversationContext";
import { TextInput, View, TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import { Link } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { FlatList } from "react-native-gesture-handler";
import { ref, get } from "firebase/database";
import Firebase from "../config/firebase";
import { addMessageNotification } from '../context/notification'; // Adjust the import path


// Define the maximum number of characters
const MAX_CHARACTERS = 100;

// Component to render each message item
const MessageItem = ({ message, currentUser, otherUser }) => {
  const sender = message.sender === currentUser.id ? currentUser.username : otherUser?.username || "Unknown";
  return (
    <View style={styles.messageItem}>
      <Text style={styles.senderText}>{sender}</Text>
      <Text style={styles.messageText}>{message.content}</Text>
    </View>
  );
};

const Conversation = ({ route, navigation }) => {
  // Memoized conversation ID from route parameters
  const conversationId = useMemo(() => {
    return route.params?.cid;
  }, [route]);

  const {
    activeConversation, // Active conversation state
    conversationLoading, // Loading state for conversation
    conversationLoadingError, // Error state for conversation loading
    sendMessageToConversation, // Function to send a message in the conversation
  } = useActiveConversation({ route, navigation });

  const [messageContent, setMessageContent] = useState(""); // State for managing the message content
  const [totalCharacters, setTotalCharacters] = useState(0); // State to track total characters sent by user
  const { user } = useAuth(); // Hook to get the current authenticated user
  const [otherUser, setOtherUser] = useState(null); // State to store the other user

  const flatListRef = useRef(null); // Ref for the FlatList

  useEffect(() => {
    const fetchOtherUser = async () => {
      if (activeConversation) {
        const otherUserId = activeConversation.user_1 === user.id ? activeConversation.user_2 : activeConversation.user_1;
        const userRef = ref(Firebase.Database, `users/${otherUserId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          setOtherUser(snapshot.val());
        }
      }
    };

    fetchOtherUser();
  }, [activeConversation, user.id]);

  useEffect(() => {
    if (activeConversation && activeConversation.messages) {
      const total = activeConversation.messages
        .filter(message => message.sender === user.id)
        .reduce((acc, message) => acc + message.content.replace(/\s+/g, '').length, 0); // Remove white spaces
      setTotalCharacters(total);
      
      // Scroll to the end when messages change
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [activeConversation, user.id]);

  // Function to send a message
  const sendMessage = () => {
    const trimmedMessageContent = messageContent.replace(/\s+/g, ''); // Remove white spaces
    if (trimmedMessageContent.length + totalCharacters > MAX_CHARACTERS) {
      Alert.alert("Character limit exceeded", `You can only send a total of ${MAX_CHARACTERS} characters.`);
    } else {
      sendMessageToConversation(conversationId, messageContent);
      setMessageContent(""); // Clear the message input

      // Add message notification after sending a message
        if (otherUser) {
          addMessageNotification(otherUser.id, user.username);
        }
      // Scroll to the end after sending a message
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  // Render loading state
  if (conversationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Conversation loading...</Text>
      </View>
    );
  }

  // Render error state or if no active conversation
  if (conversationLoadingError || !activeConversation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Oops! There was an error loading the conversation.{" "}
          <Link to={{ screen: "Conversations" }} style={styles.linkText}>Back to conversation list</Link>
        </Text>
      </View>
    );
  }

  // Render the conversation view
  return (
    <View style={styles.container}>
      {otherUser && <Text style={styles.headerText}>Conversation with {otherUser.username}</Text>}
      <Text style={styles.subtitle}>
        You have up to {MAX_CHARACTERS} characters to set a place to meet
      </Text>
      <FlatList
        ref={flatListRef} // Attach the ref to FlatList
        data={activeConversation.messages || []} // Data for FlatList: messages in the active conversation
        renderItem={({ item: message }) => (
          <MessageItem otherUser={otherUser} currentUser={user} message={message} /> // Render each message item
        )}
        keyExtractor={(item) => item.date.toString()} // Unique key for each message
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })} // Scroll to the end when content size changes
      />
      <TextInput
        placeholder="Enter message"
        value={messageContent}
        onChangeText={setMessageContent} // Handle text input changes
        maxLength={MAX_CHARACTERS - totalCharacters + messageContent.replace(/\s+/g, '').length} // Limit input length based on remaining characters, excluding white spaces
        style={styles.input}
      />
      <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
      <Text style={styles.characterCount}>
        {totalCharacters}/{MAX_CHARACTERS} characters used 
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FAFAFA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: "#333333",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: "#F44336",
    textAlign: 'center',
  },
  linkText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2196F3",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#777777",
    marginBottom: 20,
    textAlign: "center",
  },
  messageItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  senderText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "bold",
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
    color: "#333333",
  },
  input: {
    height: 50,
    borderColor: "#CCCCCC",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  characterCount: {
    textAlign: "center",
    color: "#333333",
    marginTop: 10,
  },
});

export default Conversation;
