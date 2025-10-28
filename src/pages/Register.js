// src/pages/Register.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.png'; // Logoyu import et (yolu src/assets/logo.jpg varsayıldı)

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      setLoading(false);
      return;
    }

    try {
      await register(formData.email, formData.password, formData.username);
      navigate('/dashboard'); // Başarılı kayıtta Dashboard'a yönlendir
    } catch (error) {
      console.error('Register error details:', error);
      let errorMessage = 'Kayıt başarısız';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanılıyor';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf (en az 6 karakter olmalı)';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi';
      } else {
        errorMessage = 'Kayıt sırasında bir hata oluştu.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* --- LOGO EKLENDİ --- */}
          <img
            className="mx-auto h-24 w-auto" // Yüksekliği ayarlandı
            src={logo}
            alt="Sanal Borsa Logosu"
          />
          {/* --- BİTTİ --- */}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Yeni hesap oluşturun
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                name="username"
                autoComplete="username" // Otomatik tamamlama eklendi
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Kullanıcı adı"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <input
                type="email"
                name="email"
                autoComplete="email" // Otomatik tamamlama eklendi
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="E-posta adresi"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <input
                type="password"
                name="new-password" // name eklendi
                autoComplete="new-password" // Otomatik tamamlama eklendi
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Şifre (en az 6 karakter)"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password" // Otomatik tamamlama eklendi
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Şifre tekrar"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt ol'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Zaten hesabınız var mı? Giriş yapın
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;