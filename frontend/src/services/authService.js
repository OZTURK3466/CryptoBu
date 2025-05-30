const API_BASE_URL = 'http://localhost:3001/api';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  // Connexion
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }

      this.token = data.token;
      this.user = data.user;

      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.user));

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Inscription
  async register(username, email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur d\'inscription');
      }

      this.token = data.token;
      this.user = data.user;

      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.user));

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Déconnexion
  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  // Obtenir le token
  getToken() {
    return this.token;
  }

  // Obtenir l'utilisateur actuel
  getCurrentUser() {
    return this.user;
  }

  // Faire un appel API authentifié
  async apiCall(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expiré ou invalide
      this.logout();
      window.location.href = '/login';
      throw new Error('Session expirée');
    }

    return response;
  }

  // Récupérer les infos utilisateur actualisées
  async getCurrentUserData() {
    try {
      const response = await this.apiCall(`${API_BASE_URL}/auth/me`);
      const data = await response.json();

      if (response.ok) {
        this.user = { ...this.user, ...data.user };
        localStorage.setItem('user', JSON.stringify(this.user));
        return this.user;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur:', error);
    }
    return this.user;
  }
}

export default new AuthService();