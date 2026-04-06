import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const approvePayment = async (requestId: string, userId: string) => {
  try {
    await updateDoc(doc(db, 'paymentRequests', requestId), {
      status: 'approved',
      updatedAt: Timestamp.now()
    });
    
    await updateDoc(doc(db, 'users', userId), {
      subscriptionStatus: 'active',
      paymentPending: false,
      paymentApprovedAt: new Date().toISOString(),
      isReleased: true
    });
  } catch (error) {
    console.error("Error approving payment:", error);
    throw error;
  }
};

export const rejectPayment = async (requestId: string, userId: string) => {
  try {
    await updateDoc(doc(db, 'paymentRequests', requestId), {
      status: 'rejected',
      updatedAt: Timestamp.now()
    });
    
    await updateDoc(doc(db, 'users', userId), {
      paymentPending: false
    });
  } catch (error) {
    console.error("Error rejecting payment:", error);
    throw error;
  }
};

export const releaseAccess = async (userId: string) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isReleased: true,
      subscriptionStatus: 'active'
    });
  } catch (error) {
    console.error("Error releasing access:", error);
    throw error;
  }
};

export const pauseAccess = async (userId: string) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isReleased: false,
      subscriptionStatus: 'paused'
    });
  } catch (error) {
    console.error("Error pausing access:", error);
    throw error;
  }
};
