import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Lock, CreditCard, FileText, ExternalLink, 
  Edit2, Plus, Trash2, Download, CheckCircle, Settings, 
  Star, Calendar, AlertCircle, Package, MessageSquare,
  ToggleLeft, ToggleRight, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Seo from '../components/utils/Seo';
import CountrySelect from '../components/ui/CountrySelect';
import { userPaymentMethods, userBillingHistory, boosterPacks } from '../data/mockData';
import BoosterPacksGrid from '../components/sections/BoosterPacksGrid';
import { Country } from '../types';

// Tabs
const tabs = [
  { id: 'account', label: 'Account' },
  { id: 'premium', label: 'Premium' },
  { id: 'payment', label: 'Payment Methods' },
  { id: 'billing', label: 'Billing History' },
];

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { currentUser, isLoggedIn, isLoading, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const boosterPacksRef = useRef<HTMLDivElement>(null);

  // If not logged in, redirect to login
  React.useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      navigate('/uiux/login');
    } else if (currentUser) {
      setUsername(currentUser.username);
      setEmail(currentUser.email);
    }
  }, [isLoggedIn, currentUser, navigate, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-dark font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return null; // or loading state
  }
  
  const handleSaveUsername = () => {
    // In a real app, this would call an API to update the username
    updateUserProfile({ username });
    setIsEditingUsername(false);
    setSuccessMessage('Username updated successfully!');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      if (setSuccessMessage) {
        setSuccessMessage(null);
      }
    }, 3000);
  };
  
  const handleSaveEmail = () => {
    // In a real app, this would call an API to update the email
    updateUserProfile({ email });
    setIsEditingEmail(false);
    setSuccessMessage('Email updated successfully!');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };
  
  const handleCancelEdit = (field: 'username' | 'email') => {
    if (field === 'username') {
      setUsername(currentUser.username);
      setIsEditingUsername(false);
    } else {
      setEmail(currentUser.email);
      setIsEditingEmail(false);
    }
  };
  
  const handlePasswordReset = () => {
    // In a real app, this would send a password reset email
    console.log('Password reset requested');
    setSuccessMessage('Password reset link sent to your email!');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };
  
  const handleToggleComments = () => {
    // In a real app, this would call an API to update the setting
    setAllowComments(!allowComments);
    setSuccessMessage(`Comments are now ${!allowComments ? 'allowed' : 'disabled'} on your artwork`);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };
  
  const handleAddPaymentMethod = () => {
    // In a real app, this would open a payment method form
    console.log('Add payment method');
  };
  
  const handleSetDefaultPaymentMethod = (id: string) => {
    // In a real app, this would call an API to set the default payment method
    console.log('Set default payment method:', id);
  };
  
  const handleRemovePaymentMethod = (id: string) => {
    // In a real app, this would call an API to remove the payment method
    console.log('Remove payment method:', id);
  };
  
  const handleCountryChange = (country: Country) => {
    // Update the user's country
    updateUserProfile({ country });
    setSuccessMessage('Country updated successfully!');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Get card brand icon
  const getCardBrandIcon = (type: 'visa' | 'mastercard' | 'amex' | 'discover') => {
    switch (type) {
      case 'visa':
        return '💳 Visa';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 Amex';
      case 'discover':
        return '💳 Discover';
      default:
        return '💳';
    }
  };

  // Filter booster packs to simulate user's owned packs
  const userOwnedPacks = boosterPacks.filter(pack => 
    pack.type === 'free' || pack.type === 'premium'
  );
  
  return (
    <>
      <Seo 
        title="My Profile"
        description="Manage your SketchyAF account, payment methods, and view your billing history."
      />
      
      <div className="py-16 md:py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-8 transform rotate-[-1deg]">
              My Account
            </h1>
            
            {/* Success Message */}
            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 bg-green/10 border border-green text-dark rounded-md flex items-center"
              >
                <CheckCircle size={20} className="mr-2 flex-shrink-0 text-green" />
                <p>{successMessage}</p>
              </motion.div>
            )}
            
            {/* Tabs */}
            <div className="flex flex-wrap border-b border-light-gray mb-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`py-4 px-6 font-heading font-semibold text-lg ${
                    activeTab === tab.id 
                    ? 'text-primary border-b-2 border-primary' 
                    : 'text-medium-gray hover:text-primary'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border-2 border-dark hand-drawn">
                <div className="mb-8">
                  <h2 className="font-heading font-bold text-2xl mb-6">🔐 Account Overview</h2>
                  
                  {/* Avatar Section */}
                  <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                    <div className="relative">
                      {currentUser.avatar ? (
                        <img 
                          src={currentUser.avatar}
                          alt={currentUser.username}
                          className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-light-gray flex items-center justify-center border-2 border-primary">
                          <User size={40} className="text-medium-gray" />
                        </div>
                      )}
                      <button
                        className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full"
                        aria-label="Change avatar"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    
                    <div>
                      <h3 className="font-heading font-bold text-xl">Profile Picture</h3>
                      <p className="text-medium-gray mb-2">Upload your avatar to personalize your profile</p>
                      <Button variant="tertiary" size="sm">
                        Upload New Picture
                      </Button>
                    </div>
                  </div>
                  
                  {/* Username Section */}
                  <div className="mb-6 border-b border-light-gray pb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-heading font-semibold">Username</h3>
                      {!isEditingUsername && (
                        <Button 
                          variant="tertiary" 
                          size="sm" 
                          onClick={() => setIsEditingUsername(true)}
                        >
                          <Edit2 size={16} className="mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    
                    {isEditingUsername ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="border border-light-gray p-2 rounded-md"
                        />
                        <Button 
                          variant="tertiary" 
                          size="sm"
                          onClick={handleSaveUsername}
                        >
                          Save
                        </Button>
                        <Button 
                          variant="tertiary" 
                          size="sm"
                          onClick={() => handleCancelEdit('username')}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <User size={20} className="text-medium-gray mr-2" />
                        <p className="font-semibold">{currentUser.username}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Email Section */}
                  <div className="mb-6 border-b border-light-gray pb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-heading font-semibold">Email Address</h3>
                      {!isEditingEmail && (
                        <Button 
                          variant="tertiary" 
                          size="sm" 
                          onClick={() => setIsEditingEmail(true)}
                        >
                          <Edit2 size={16} className="mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    
                    {isEditingEmail ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="border border-light-gray p-2 rounded-md"
                        />
                        <Button 
                          variant="tertiary" 
                          size="sm"
                          onClick={handleSaveEmail}
                        >
                          Save
                        </Button>
                        <Button 
                          variant="tertiary" 
                          size="sm"
                          onClick={() => handleCancelEdit('email')}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Mail size={20} className="text-medium-gray mr-2" />
                        <p>{currentUser.email}</p>
                        <span className="ml-2 text-xs bg-success text-white px-2 py-1 rounded-full">Verified</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Country Section */}
                  <div className="mb-6 border-b border-light-gray pb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-heading font-semibold">Country</h3>
                    </div>
                    
                    <div className="flex items-center">
                      <Globe size={20} className="text-medium-gray mr-2 flex-shrink-0" />
                      <CountrySelect 
                        value={currentUser.country}
                        onChange={handleCountryChange}
                        placeholder="Select your country"
                        className="flex-grow max-w-md"
                      />
                    </div>
                    <p className="mt-2 text-sm text-medium-gray">
                      Your country will be displayed on your public profile and the leaderboard
                    </p>
                  </div>
                  
                  {/* Password Section */}
                  <div className="mb-6 border-b border-light-gray pb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-heading font-semibold">Password</h3>
                      <Button 
                        variant="tertiary" 
                        size="sm" 
                        onClick={handlePasswordReset}
                      >
                        Reset Password
                      </Button>
                    </div>
                    <div className="flex items-center">
                      <Lock size={20} className="text-medium-gray mr-2" />
                      <p>••••••••</p>
                    </div>
                  </div>
                  
                  {/* Account Creation Date */}
                  <div className="mb-6">
                    <h3 className="font-heading font-semibold mb-2">Account Created</h3>
                    <div className="flex items-center">
                      <Calendar size={20} className="text-medium-gray mr-2" />
                      <p>March 15, 2025</p>
                    </div>
                  </div>
                </div>
                
                {/* Profile Visibility */}
                <div className="mb-8">
                  <h2 className="font-heading font-bold text-2xl mb-4">🌐 Profile Visibility</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-off-white p-4 rounded-lg">
                      <div className="flex items-center">
                        <MessageSquare size={20} className="text-primary mr-3" />
                        <div>
                          <h3 className="font-heading font-semibold">Allow Comments on Artwork</h3>
                          <p className="text-sm text-medium-gray">Let other users comment on your artwork</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleToggleComments}
                        className="text-primary"
                        aria-label={allowComments ? "Disable comments" : "Enable comments"}
                      >
                        {allowComments ? (
                          <ToggleRight size={28} className="text-success" />
                        ) : (
                          <ToggleLeft size={28} className="text-medium-gray" />
                        )}
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <Button 
                        variant="secondary" 
                        size="sm"
                      >
                        <ExternalLink size={16} className="mr-1" /> View Public Profile
                      </Button>
                    </div>
                    <Button 
                      variant="tertiary" 
                      size="sm"
                    >
                      <Settings size={16} className="mr-1" /> More Privacy Settings
                    </Button>
                  </div>
                </div>
                
                {/* Support & Legal */}
                <div>
                  <h2 className="font-heading font-bold text-2xl mb-4">🔗 Support & Legal</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button variant="tertiary" size="sm" href="#">FAQ / Help Center</Button>
                    <Button variant="tertiary" size="sm" href="#">Contact Support</Button>
                    <Button variant="tertiary" size="sm" to="/terms">Terms of Service</Button>
                    <Button variant="tertiary" size="sm" to="/privacy">Privacy Policy</Button>
                    <Button variant="tertiary" size="sm" href="#">Refund Policy</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Premium Tab */}
            {activeTab === 'premium' && (
              <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border-2 border-dark hand-drawn">
                <div className="mb-8">
                  <h2 className="font-heading font-bold text-2xl mb-6">⭐ Premium Status</h2>
                  
                  {/* Subscription Status */}
                  <div className="bg-primary/10 p-6 rounded-lg mb-8 border-2 border-primary">
                    <div className="flex items-center mb-4">
                      <Star size={24} className="text-primary mr-3" />
                      <h3 className="font-heading font-bold text-xl">Premium Subscriber</h3>
                    </div>
                    <p className="mb-4">You have access to all premium features and exclusive content!</p>
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        to="/premium"
                      >
                        Manage Subscription
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        href="#"
                      >
                        View Benefits
                      </Button>
                    </div>
                  </div>
                  
                  {/* User's Booster Packs */}
                  <div className="mb-6">
                    <div className="flex items-center mb-6">
                      <Package size={24} className="text-dark mr-3" />
                      <h2 className="font-heading font-bold text-2xl">Your Booster Packs</h2>
                    </div>
                    
                    <BoosterPacksGrid packs={userOwnedPacks} ref={boosterPacksRef} />
                    
                    <div className="mt-8 text-center">
                      <Button 
                        variant="secondary" 
                        size="md" 
                        to="/premium#booster-packs"
                      >
                        Get More Packs
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Payment Methods Tab */}
            {activeTab === 'payment' && (
              <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border-2 border-dark hand-drawn">
                <div className="mb-8">
                  <h2 className="font-heading font-bold text-2xl mb-6">💳 Payment Methods</h2>
                  
                  <div className="mb-6">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={handleAddPaymentMethod}
                    >
                      <Plus size={16} className="mr-1" /> Add Payment Method
                    </Button>
                  </div>
                  
                  {userPaymentMethods.length > 0 ? (
                    <div className="space-y-4">
                      {userPaymentMethods.map(method => (
                        <div 
                          key={method.id} 
                          className={`border ${method.isDefault ? 'border-primary' : 'border-light-gray'} rounded-md p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}
                        >
                          <div className="flex items-center">
                            <div className="mr-4 text-2xl">
                              {getCardBrandIcon(method.type)}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <p className="font-medium">•••• •••• •••• {method.last4}</p>
                                {method.isDefault && (
                                  <span className="ml-2 text-xs bg-primary text-white px-2 py-1 rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-medium-gray">
                                Expires {method.expMonth}/{method.expYear}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {!method.isDefault && (
                              <Button 
                                variant="tertiary" 
                                size="sm"
                                onClick={() => handleSetDefaultPaymentMethod(method.id)}
                              >
                                <CheckCircle size={16} className="mr-1" /> Set Default
                              </Button>
                            )}
                            <Button 
                              variant="tertiary" 
                              size="sm"
                              onClick={() => handleRemovePaymentMethod(method.id)}
                            >
                              <Trash2 size={16} className="mr-1" /> Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 border border-dashed border-light-gray rounded-md">
                      <p className="text-medium-gray">No payment methods found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Billing History Tab */}
            {activeTab === 'billing' && (
              <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg border-2 border-dark hand-drawn">
                <div>
                  <h2 className="font-heading font-bold text-2xl mb-6">📑 Billing History</h2>
                  
                  <div className="mb-6 flex flex-wrap gap-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        className="border border-light-gray p-2 pl-10 rounded-md"
                      />
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-medium-gray">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>
                    
                    <select className="border border-light-gray p-2 rounded-md">
                      <option>All Time</option>
                      <option>Last 30 Days</option>
                      <option>Last 3 Months</option>
                      <option>Last 6 Months</option>
                      <option>Last Year</option>
                    </select>
                  </div>
                  
                  {userBillingHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-light-gray">
                        <thead className="bg-off-white">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-heading font-semibold text-primary uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-heading font-semibold text-primary uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-heading font-semibold text-primary uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-heading font-semibold text-primary uppercase tracking-wider">
                              Payment Method
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-heading font-semibold text-primary uppercase tracking-wider">
                              Invoice
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-light-gray">
                          {userBillingHistory.map(transaction => (
                            <tr key={transaction.id} className="hover:bg-off-white">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {formatDate(transaction.date)}
                              </td>
                              <td className="px-6 py-4">
                                {transaction.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-medium">
                                ${transaction.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {transaction.paymentMethod}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Button variant="tertiary" size="sm" href={transaction.invoiceUrl}>
                                  <Download size={16} className="mr-1" /> PDF
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center p-8 border border-dashed border-light-gray rounded-md">
                      <p className="text-medium-gray">No billing history found</p>
                    </div>
                  )}
                  
                  <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-medium-gray text-sm">
                      Showing 1-5 of 5 transactions
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 border border-light-gray rounded-md text-medium-gray" disabled>
                        Previous
                      </button>
                      <button className="px-3 py-1 border border-light-gray rounded-md text-medium-gray" disabled>
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Profile;