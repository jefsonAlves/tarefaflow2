import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const createPaymentRequest = async (userId: string, userEmail: string, plan: 'monthly' | 'yearly') => {
  try {
    const docRef = await addDoc(collection(db, 'paymentRequests'), {
      userId,
      userEmail,
      plan,
      status: 'pending',
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating payment request:", error);
    throw error;
  }
};
