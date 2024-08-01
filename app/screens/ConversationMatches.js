import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ImageBackground, Image } from "react-native";
import { useConversationTopicMatches } from "../context/ConversationContext";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import useSettings from "../components/useSettings";
import SettingsButton from "../components/SettingsButton";
import { useCurrentLocation } from "../context/LocationContext";
import { ref, onValue } from "firebase/database";
import Firebase from "../config/firebase";
import { calculateDistance } from "../utils";
import ConfettiCannon from 'react-native-confetti-cannon';

const MatchItem = ({ otherUser, navigation }) => {
  const { t } = useTranslation();
  const {
    startConversation,
    sendConversationRequest,
    isApproved,
    requests,
    isDeclined,
    isPending,
  } = useConversationTopicMatches();
  const { user } = useAuth();

  const handlePressStartConversation = async (requestId_1, requestId_2) => {
    try {
      const conversationId = await startConversation(otherUser.id, requestId_1, requestId_2);
      if (conversationId) {
        navigation.navigate("Conversation", { cid: conversationId });
      } else {
        Alert.alert(t("There was a problem starting conversation with", { username: otherUser.username }));
      }
    } catch (e) {
      Alert.alert(e.message);
    }
  };

  const handlePressSendRequest = async () => {
    try {
      const conversationId = await sendConversationRequest(otherUser.id);
      if (conversationId) {
        Alert.alert(t(`Request has been sent to ${otherUser.username}`));
      } else {
        Alert.alert(t(`There was a problem sending conversation request to ${otherUser.username}`));
      }
    } catch (e) {
      Alert.alert(e.message);
    }
  };

  const Status = useCallback(() => {
    const approved = isApproved(otherUser.id);
    const declined = isDeclined(otherUser.id);
    const { sender, recipient } = isPending(otherUser.id);
    const cid1 = `${otherUser.id}_${user.id}`;
    const cid2 = `${user.id}_${otherUser.id}`;

    const StartConversationButton = () => (
      <TouchableOpacity
        style={[styles.startConversationButton, { backgroundColor: approved ? "#4CAF50" : sender ? "#BDBDBD" : "transparent" }]}
        disabled={!sender && !approved}
        onPress={() => handlePressStartConversation(cid1, cid2)}
      >
        <Text
          style={{
            color: approved || sender ? "#FFFFFF" : declined ? "#F44336" : "#9E9E9E",
          }}
        >
          {t("Start conversation")}
        </Text>
      </TouchableOpacity>
    );

    if (approved) {
      return (
        <View>
          <Text style={styles.statusText}>{t("Status: Approved")}</Text>
          <StartConversationButton />
        </View>
      );
    } else if (declined) {
      return (
        <View>
          <Text style={styles.statusText}>{t("Status: Declined")}</Text>
          <StartConversationButton />
        </View>
      );
    } else if (sender || recipient) {
      return (
        <View>
          <Text style={styles.statusText}>{t("Status: Pending")}</Text>
          <StartConversationButton />
        </View>
      );
    }
    return (
      <View>
        <TouchableOpacity style={styles.button} onPress={handlePressSendRequest}>
          <Text style={styles.buttonText}>{t("Send request")}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [requests]);

  // Determine profile image to show
  const profileImage = otherUser.profileImage
    ? { uri: otherUser.profileImage }
    : otherUser.gender === "Woman"
    ? require('../assets/defaultProfileImageWoman.png')
    : require('../assets/defaultProfileImageMan.png');

  return (
    <View style={styles.matchItem}>
      <Image source={profileImage} style={styles.profilePicture} />
      <View style={styles.matchItemTextContainer}>
        <Text style={styles.matchText}>{otherUser.username}</Text>
        <Status />
      </View>
    </View>
  );
};

const ConversationMatches = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { backgroundImage, handleBackgroundChange, handleLanguageChange, handleSignOut } = useSettings();
  const { currentLocation, interestRadius } = useCurrentLocation();
  const [conversationTopicResults, setConversationTopicResults] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (user) {
      const usersRef = ref(Firebase.Database, 'users');
      const listener = onValue(usersRef, (snapshot) => {
        const results = [];
        snapshot.forEach((childSnapshot) => {
          const otherUser = childSnapshot.val();
          if (
            otherUser.id !== user.id && // Exclude the current user
            otherUser.conversationTopics &&
            user.conversationTopics &&
            user.conversationTopics.some(topic => otherUser.conversationTopics.includes(topic))
          ) {
            results.push(otherUser);
          }
        });
        setConversationTopicResults(results);
      });
      return () => listener(); // Cleanup the listener on unmount
    }
  }, [user]);

  const filteredMatches = useMemo(() => {
    // Filter users based on topics and distance
    if (!user || !user.mainCategory || !user.conversationTopics /*|| !currentLocation*/) {
      return [];
    }

    const matches = conversationTopicResults.filter(otherUser => {
      if (!otherUser.mainCategory || !otherUser.conversationTopics /*|| !otherUser.currentLocation*/) {
        return false;
      }

      const sameMainCategory = user.mainCategory === otherUser.mainCategory;
      const commonTopics = user.conversationTopics.some(topic => otherUser.conversationTopics.includes(topic));
      const distance = calculateDistance(currentLocation.coords, otherUser.currentLocation.coords);

      return sameMainCategory && commonTopics /*&& distance <= interestRadius*/;
    });

    if (matches.length > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000); 
    }

    return matches;
  }, [conversationTopicResults, currentLocation, interestRadius, user]);

  return (
    <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.container}>
        <SettingsButton
          onBackgroundChange={handleBackgroundChange}
          onLanguageChange={handleLanguageChange}
          onSignOut={() => handleSignOut(navigation)}
        />
        {showConfetti && <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} style={styles.confetti} />}
        {filteredMatches.length === 0 && (
          <Text style={styles.noMatchesText}>{t("No matches found for the selected topics within the specified distance")}</Text>
        )}
        {filteredMatches.length > 0 && <Text style={styles.matchesText}>{t("Matches")}:</Text>}
        <FlatList
          data={filteredMatches}
          renderItem={({ item: otherUser }) => (
            <MatchItem otherUser={otherUser} navigation={navigation} />
          )}
          keyExtractor={(item) => item.id}
          numColumns={2} // Two items per row
          columnWrapperStyle={{ justifyContent: 'space-between' }} // Space between items
        />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999, // Ensure the confetti is in front of everything
  },
  noMatchesText: {
    fontSize: 18,
    marginBottom: 20,
    marginTop: 60,
    textAlign: "center",
    color: "#F44336",
  },
  matchesText: {
    fontSize: 40,
    marginBottom: 20,
    color: "#2e2934",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 50,
  },
  matchItem: {
    backgroundColor: "transparent", // Set background to transparent
    borderRadius: 25,
    padding: 20,
    marginBottom: 15,
    width: '48%', // Adjust width to fit two items per row with spacing
    flexDirection: "column",
    alignItems: "center",
    shadowColor: "transparent",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  matchItemTextContainer: {
    alignItems: "center",
  },
  matchText: {
    fontSize: 20,
    color: "#333333",
    fontWeight: "bold",
    marginTop: 10,
  },
  button: {
    padding: 12,
    borderRadius: 5,
    backgroundColor: "#2196F3",
    alignItems: "center",
    marginTop: 10,
  },
  startConversationButton: {
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
});

export default ConversationMatches;
