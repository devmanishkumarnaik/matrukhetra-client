import { useState, useEffect, useRef } from 'react';
import { FaUser, FaLock, FaEnvelope, FaPhone, FaCamera, FaChalkboardTeacher, FaUserGraduate, FaUsers, FaClock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import Popup from './Popup';
import Navbar from './Navbar';
import { useSocket } from '../contexts/SocketContext';
import './Register.css';

const Register = () => {
  const [activeTab, setActiveTab] = useState('register');
  const [userType, setUserType] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [popup, setPopup] = useState({ message: '', type: '', show: false });

  // Helper to read saved pending registration (excludes if already logged in)
  const getSavedPending = () => {
    if (localStorage.getItem('userToken')) return null;
    const saved = localStorage.getItem('pendingRegistration');
    if (!saved) return null;
    try { return JSON.parse(saved); } catch { localStorage.removeItem('pendingRegistration'); return null; }
  };

  const [pendingApproval, setPendingApproval] = useState(() => !!getSavedPending());
  const [pendingUserId, setPendingUserId] = useState(() => getSavedPending()?.userId || null);
  const [pendingCredentials, setPendingCredentials] = useState(() => {
    const s = getSavedPending();
    return s ? { identifier: s.identifier, password: s.password } : null;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { socket, joinUserRoom } = useSocket();
  const approvalListenerRef = useRef(false);

  const showPopup = (message, type = 'info') => {
    setPopup({ message, type, show: true });
  };

  const closePopup = () => {
    setPopup({ message: '', type: '', show: false });
  };

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (token) {
      navigate('/profile');
    }
  }, [navigate]);

  // Listen for admin approval via socket
  useEffect(() => {
    if (!pendingApproval || !pendingUserId || !socket || approvalListenerRef.current) return;

    approvalListenerRef.current = true;
    joinUserRoom(pendingUserId);

    const handleStatusChange = async (data) => {
      if (data.isActivated && pendingCredentials) {
        showPopup('Your account has been approved by admin! Logging you in...', 'success');
        try {
          const response = await axios.post('/login', {
            identifier: pendingCredentials.identifier,
            password: pendingCredentials.password
          });
          localStorage.removeItem('pendingRegistration');
          localStorage.setItem('userToken', response.data.token);
          localStorage.setItem('userType', response.data.user.userType);
          localStorage.setItem('isActivated', response.data.user.isActivated);
          window.dispatchEvent(new Event('storage'));
          setTimeout(() => {
            navigate('/profile');
          }, 1500);
        } catch {
          showPopup('Account approved! Please login manually.', 'info');
          localStorage.removeItem('pendingRegistration');
          setPendingApproval(false);
          setActiveTab('login');
        }
      } else if (!data.isActivated) {
        showPopup('Your account has been deactivated by admin.', 'error');
      }
    };

    socket.on('account-status-changed', handleStatusChange);

    return () => {
      socket.off('account-status-changed', handleStatusChange);
      approvalListenerRef.current = false;
    };
  }, [pendingApproval, pendingUserId, socket, pendingCredentials, navigate, joinUserRoom]);

  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    rollNumber: '',
    class: '',
    fatherName: '',
    motherName: '',
    parentsMobile: ''
  });

  const [loginData, setLoginData] = useState({
    emailOrRollNumber: '',
    password: ''
  });

  const classes = ['Nursery', 'KG1', 'KG2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showPopup('Photo size must be under 1MB. Please choose a smaller image.', 'error');
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRegisterChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value
    });
  };

  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!userType) {
      showPopup('Please select user type (Teacher, Student or Member)', 'error');
      setIsSubmitting(false);
      return;
    }

    if (!photo) {
      showPopup('Please upload a photo', 'error');
      setIsSubmitting(false);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      showPopup('Passwords do not match. Please re-enter your password.', 'error');
      setIsSubmitting(false);
      return;
    }

    if (registerData.password.length < 6) {
      showPopup('Password must be at least 6 characters', 'error');
      setIsSubmitting(false);
      return;
    }

    // Validate required fields for students
    if (userType === 'student') {
      if (!registerData.rollNumber) {
        showPopup('Roll number is required for students', 'error');
        return;
      }
      if (!registerData.fatherName) {
        showPopup("Father's name is required for students", 'error');
        return;
      }
      if (!registerData.motherName) {
        showPopup("Mother's name is required for students", 'error');
        return;
      }
      if (!registerData.parentsMobile) {
        showPopup('Parents mobile number is required for students', 'error');
        return;
      }
      // Validate parents mobile number (must be exactly 10 digits)
      const parentsMobileDigits = registerData.parentsMobile.replace(/\D/g, '');
      if (parentsMobileDigits.length !== 10) {
        showPopup('Parents mobile number must be exactly 10 digits', 'error');
        return;
      }
      if (!registerData.email) {
        showPopup('Email is required for students', 'error');
        return;
      }
      if (!registerData.class) {
        showPopup('Class is required for students', 'error');
        return;
      }
      if (!registerData.password) {
        showPopup('Password is required', 'error');
        return;
      }
    }
    
    // Validate required fields for teachers
    if (userType === 'teacher') {
      if (!registerData.email) {
        showPopup('Email is required for teachers', 'error');
        return;
      }
      if (!registerData.phone) {
        showPopup('Phone number is required for teachers', 'error');
        return;
      }
      if (!registerData.password) {
        showPopup('Password is required', 'error');
        return;
      }
      // Validate phone number for teachers (must be exactly 10 digits)
      const phoneDigits = registerData.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        showPopup('Phone number must be exactly 10 digits', 'error');
        return;
      }
    }
    
    // Validate required fields for members
    if (userType === 'member') {
      if (!registerData.email) {
        showPopup('Email is required for members', 'error');
        return;
      }
      if (!registerData.password) {
        showPopup('Password is required', 'error');
        return;
      }
      // Validate phone number for members if provided (must be exactly 10 digits)
      if (registerData.phone) {
        const phoneDigits = registerData.phone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
          showPopup('Phone number must be exactly 10 digits', 'error');
          return;
        }
      }
    }

    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('userType', userType);
    formData.append('firstName', registerData.firstName);
    formData.append('lastName', registerData.lastName);
    
    if (userType === 'teacher' || userType === 'member') {
      formData.append('email', registerData.email);
      if (registerData.phone) formData.append('phone', registerData.phone); // Phone is optional for members
      formData.append('password', registerData.password);
    } else {
      formData.append('rollNumber', registerData.rollNumber);
      formData.append('fatherName', registerData.fatherName);
      formData.append('motherName', registerData.motherName);
      formData.append('parentsMobile', registerData.parentsMobile);
      formData.append('email', registerData.email);
      formData.append('class', registerData.class);
      formData.append('password', registerData.password);
    }
    
    // Debug logging
    console.log('Sending registration data:', {
      userType,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      email: registerData.email,
      phone: registerData.phone,
      rollNumber: registerData.rollNumber,
      class: registerData.class,
      hasPhoto: !!photo
    });

    try {
      const response = await axios.post('/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const registeredUserId = response.data.data?._id;
      const identifier = registerData.email || registerData.rollNumber;
      const password = registerData.password;

      // Persist pending approval so refresh keeps showing the waiting screen
      localStorage.setItem('pendingRegistration', JSON.stringify({
        userId: registeredUserId,
        identifier,
        password
      }));

      // Store credentials for auto-login on approval
      setPendingUserId(registeredUserId);
      setPendingCredentials({ identifier, password });
      setPendingApproval(true);
      approvalListenerRef.current = false; // Reset so effect re-runs

      // Reset registration form fields but stay on page
      setUserType('');
      setPhoto(null);
      setPhotoPreview('');
      setRegisterData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        rollNumber: '',
        class: '',
        fatherName: '',
        motherName: '',
        parentsMobile: ''
      });
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response) {
        if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again or contact support.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showPopup(errorMessage, 'error');
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/login', {
        identifier: loginData.emailOrRollNumber,
        password: loginData.password
      });
      
      showPopup('Login successful! Redirecting to your profile...', 'success');
      
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('userType', response.data.user.userType);
      localStorage.setItem('isActivated', response.data.user.isActivated);
      
      window.dispatchEvent(new Event('storage'));
      
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (error) {
      showPopup(error.response?.data?.message || 'Login failed. Please check your credentials.', 'error');
    }
  };

  // Compute whether the register form has all required fields filled
  const isFormReady = (() => {
    if (!userType || !photo) return false;
    const { firstName, lastName, password, confirmPassword } = registerData;
    if (!firstName || !lastName || !password || !confirmPassword) return false;
    if (password.length < 6 || password !== confirmPassword) return false;
    if (userType === 'teacher') {
      return !!(registerData.email && registerData.phone);
    }
    if (userType === 'member') {
      return !!registerData.email;
    }
    if (userType === 'student') {
      return !!(
        registerData.rollNumber &&
        registerData.fatherName &&
        registerData.motherName &&
        registerData.parentsMobile &&
        registerData.email &&
        registerData.class
      );
    }
    return false;
  })();

  // Pending approval screen
  if (pendingApproval) {
    return (
      <div className="register-page">
        <Navbar />
        <section id="register" className="register-section">
          <div className="container">
            <div className="pending-approval-card">
              <div className="pending-icon">
                <FaClock />
              </div>
              <h2>Registration Submitted!</h2>
              <p className="pending-subtitle">Your account is pending admin approval.</p>
              <p className="pending-info">
                Once the admin approves your account, you will be automatically logged in.
                Please keep this page open or check back later.
              </p>
              <div className="pending-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </section>
        {popup.show && (
          <Popup message={popup.message} type={popup.type} onClose={closePopup} />
        )}
      </div>
    );
  }

  return (
    <div className="register-page">
      <Navbar />
      <section id="register" className="register-section">
        <div className="container">
          <div className="section-title">
            <h2>Register / Login</h2>
            <p>Join our community of educators and students</p>
          </div>

        <div className="register-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Register
            </button>
            <button 
              className={`tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
          </div>

          {activeTab === 'register' ? (
            <form className="register-form" onSubmit={handleRegisterSubmit}>
              {/* User Type Selection */}
              <div className="user-type-selection">
                <button
                  type="button"
                  className={`user-type-btn ${userType === 'teacher' ? 'active' : ''}`}
                  onClick={() => setUserType('teacher')}
                >
                  <FaChalkboardTeacher />
                  <span>Teacher</span>
                </button>
                <button
                  type="button"
                  className={`user-type-btn ${userType === 'student' ? 'active' : ''}`}
                  onClick={() => setUserType('student')}
                >
                  <FaUserGraduate />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  className={`user-type-btn ${userType === 'member' ? 'active' : ''}`}
                  onClick={() => setUserType('member')}
                >
                  <FaUsers />
                  <span>Member</span>
                </button>
              </div>

              {/* Photo Upload - Show after user type selection */}
              {userType && (
                <div className="photo-upload-section">
                  <div className="photo-preview">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" />
                    ) : (
                      <div className="photo-placeholder">
                        <FaCamera />
                        <p>Upload Photo</p>
                      </div>
                    )}
                  </div>
                  <label className="photo-upload-btn">
                    <FaCamera /> Choose Photo (Max 1MB)
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handlePhotoChange}
                      hidden
                    />
                  </label>
                </div>
              )}

              {/* Common Fields */}
              {userType && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={registerData.firstName}
                        onChange={handleRegisterChange}
                        required
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={registerData.lastName}
                        onChange={handleRegisterChange}
                        required
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>

                  {/* Teacher Fields */}
                  {userType === 'teacher' && (
                    <>
                      <div className="form-group">
                        <label><FaEnvelope /> Email</label>
                        <input
                          type="email"
                          name="email"
                          value={registerData.email}
                          onChange={handleRegisterChange}
                          required
                          placeholder="Enter email"
                        />
                      </div>

                      <div className="form-group">
                        <label><FaPhone /> Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={registerData.phone}
                          onChange={handleRegisterChange}
                          required
                          placeholder="Enter 10-digit phone number"
                          maxLength="10"
                          pattern="[0-9]{10}"
                        />
                      </div>

                      <div className="form-group">
                        <label><FaLock /> Password</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={registerData.password}
                            onChange={handleRegisterChange}
                            required
                            placeholder="Enter password"
                          />
                          <button type="button" className="eye-toggle" onClick={() => setShowPassword(v => !v)}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label><FaLock /> Confirm Password</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={registerData.confirmPassword}
                            onChange={handleRegisterChange}
                            required
                            placeholder="Confirm password"
                          />
                          <button type="button" className="eye-toggle" onClick={() => setShowConfirmPassword(v => !v)}>
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Member Fields */}
                  {userType === 'member' && (
                    <>
                      <div className="form-group">
                        <label><FaEnvelope /> Email</label>
                        <input
                          type="email"
                          name="email"
                          value={registerData.email}
                          onChange={handleRegisterChange}
                          required
                          placeholder="Enter email"
                        />
                      </div>

                      <div className="form-group">
                        <label><FaPhone /> Phone (Optional)</label>
                        <input
                          type="tel"
                          name="phone"
                          value={registerData.phone}
                          onChange={handleRegisterChange}
                          placeholder="Enter 10-digit phone number (optional)"
                          maxLength="10"
                          pattern="[0-9]{10}"
                        />
                      </div>

                      <div className="form-group">
                        <label><FaLock /> Password</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={registerData.password}
                            onChange={handleRegisterChange}
                            required
                            placeholder="Enter password"
                          />
                          <button type="button" className="eye-toggle" onClick={() => setShowPassword(v => !v)}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label><FaLock /> Confirm Password</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={registerData.confirmPassword}
                            onChange={handleRegisterChange}
                            required
                            placeholder="Confirm password"
                          />
                          <button type="button" className="eye-toggle" onClick={() => setShowConfirmPassword(v => !v)}>
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Student Fields */}
                  {userType === 'student' && (
                    <>
                      <div className="form-group">
                        <label>Roll Number</label>
                        <input
                          type="text"
                          name="rollNumber"
                          value={registerData.rollNumber}
                          onChange={handleRegisterChange}
                          required
                          placeholder="Enter roll number"
                        />
                      </div>

                      <div className="form-group">
                        <label>Father's Name</label>
                        <input
                          type="text"
                          name="fatherName"
                          value={registerData.fatherName}
                          onChange={handleRegisterChange}
                          required
                          placeholder="Enter father's name"
                        />
                      </div>

                      <div className="form-group">
                        <label>Mother's Name</label>
                        <input
                          type="text"
                          name="motherName"
                          value={registerData.motherName}
                          onChange={handleRegisterChange}
                          required
                          placeholder="Enter mother's name"
                        />
                      </div>

                      <div className="form-group">
                        <label>Parent's Mobile Number</label>
                        <input
                          type="tel"
                          name="parentsMobile"
                          value={registerData.parentsMobile}
                          onChange={handleRegisterChange}
                          required
                          placeholder="Enter 10-digit mobile number"
                          maxLength="10"
                          pattern="[0-9]{10}"
                        />
                      </div>

                      <div className="form-group">
                        <label><FaEnvelope /> Email</label>
                        <input
                          type="email"
                          name="email"
                          value={registerData.email}
                          onChange={handleRegisterChange}
                          required
                          placeholder="Enter email address"
                        />
                      </div>

                      <div className="form-group">
                        <label>Class</label>
                        <select
                          name="class"
                          value={registerData.class}
                          onChange={handleRegisterChange}
                          required
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label><FaLock /> Password</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={registerData.password}
                            onChange={handleRegisterChange}
                            required
                            placeholder="Enter password"
                          />
                          <button type="button" className="eye-toggle" onClick={() => setShowPassword(v => !v)}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label><FaLock /> Confirm Password</label>
                        <div className="password-input-wrapper">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={registerData.confirmPassword}
                            onChange={handleRegisterChange}
                            required
                            placeholder="Confirm password"
                          />
                          <button type="button" className="eye-toggle" onClick={() => setShowConfirmPassword(v => !v)}>
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={!isFormReady || isSubmitting}
                  >
                    {isSubmitting ? 'Registering...' : 'Register'}
                  </button>
                </>
              )}
            </form>
          ) : (
            <form className="login-form" onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label><FaUser /> Email</label>
                <input
                  type="text"
                  name="emailOrRollNumber"
                  value={loginData.emailOrRollNumber}
                  onChange={handleLoginChange}
                  required
                  placeholder="Enter your email address"
                />
              </div>

              <div className="form-group">
                <label><FaLock /> Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    required
                    placeholder="Enter password"
                  />
                  <button type="button" className="eye-toggle" onClick={() => setShowLoginPassword(v => !v)}>
                    {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn">
                Login
              </button>

            </form>
          )}
        </div>
        </div>
      </section>
      {popup.show && (
        <Popup message={popup.message} type={popup.type} onClose={closePopup} />
      )}
    </div>
  );
};

export default Register;
