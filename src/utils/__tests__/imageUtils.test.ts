import { pickImage, compressImage, generateThumbnail } from '../imageUtils';

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

// Mock react-native-image-resizer
jest.mock('react-native-image-resizer', () => ({
  default: {
    createResizedImage: jest.fn(),
  },
}));

describe('imageUtils', () => {
  describe('pickImage', () => {
    it('should return null when user cancels', async () => {
      const { launchImageLibrary } = require('react-native-image-picker');
      launchImageLibrary.mockImplementation((options, callback) => {
        callback({ didCancel: true });
      });

      const result = await pickImage();
      expect(result).toBeNull();
    });

    it('should return image data when successful', async () => {
      const { launchImageLibrary } = require('react-native-image-picker');
      const mockAsset = {
        uri: 'file://test.jpg',
        type: 'image/jpeg',
        fileName: 'test.jpg',
        fileSize: 1024,
      };

      launchImageLibrary.mockImplementation((options, callback) => {
        callback({ assets: [mockAsset] });
      });

      const result = await pickImage();
      expect(result).toEqual({
        uri: 'file://test.jpg',
        type: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      });
    });
  });

  describe('compressImage', () => {
    it('should compress image successfully', async () => {
      const ImageResizer = require('react-native-image-resizer');
      ImageResizer.default.createResizedImage.mockResolvedValue({
        uri: 'file://compressed.jpg',
        size: 512,
        width: 800,
        height: 600,
      });

      const result = await compressImage('file://test.jpg');
      expect(result).toEqual({
        uri: 'file://compressed.jpg',
        size: 512,
        width: 800,
        height: 600,
      });
    });
  });
});
