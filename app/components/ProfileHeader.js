import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';

const ProfileHeader = ({ navigation }) => {
  const { user } = useAuth();

  const handleViewProfile = () => {
    navigation.navigate('ViewProfile', { userId: user.id });
  };

  // Determine the default image based on gender
  const defaultProfileImage = user?.gender === 'Female' 
    ? require('../assets/defaultProfileImageWoman.png') 
    : require('../assets/defaultProfileImageMan.png');

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleViewProfile} style={styles.touchable}>
        <View style={styles.profileImageContainer}>
          {user?.profileImage ? (
            <Image
              source={{ uri: user.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <Image
              source={defaultProfileImage}
              style={styles.profileImage}
            />
          )}
        </View>
        <View style={styles.buttonContainer}>
          <Text style={styles.viewProfileText}>View Profile</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    alignItems: 'center',
  },
  touchable: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  buttonContainer: {
    borderWidth: 1,
    borderColor: 'blue',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  viewProfileText: {
    fontSize: 14,
    color: 'blue',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProfileHeader;
