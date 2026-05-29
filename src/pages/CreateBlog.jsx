import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { uploadToCloudinary } from '../config/cloudinary';
import { blogPosts, generateUniqueSlug } from '../data/blogPosts';
import { articleCategories, generateArticleDraftFromTitle } from '../utils/articleGenerator';
import '../styles/CreateBlog.css';

export default function CreateBlog() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'Technologie',
    tags: '',
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingMode, setGeneratingMode] = useState('');
  const [generatorNote, setGeneratorNote] = useState('');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [generationSourceMode, setGenerationSourceMode] = useState('manual');

  const slugExistsInFirestore = async (slugValue) => {
    try {
      const slugQuery = query(collection(db, 'blogs'), where('slug', '==', slugValue), limit(1));
      const snapshot = await getDocs(slugQuery);
      return !snapshot.empty;
    } catch (error) {
      console.warn('Vérification de slug indisponible, fallback local utilisé.', error);
      return false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setCategoryTouched(true);
    }
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file,
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyDraftToForm = (draft) => {
    setFormData((prev) => ({
      ...prev,
      category: draft.category || prev.category,
      description: draft.description,
      content: draft.content,
      tags: draft.tags.join(', ')
    }));
  };

  const handleGenerateLocalDraft = () => {
    const title = formData.title.trim();
    if (!title) {
      alert('Ajoutez un titre avant de generer un brouillon.');
      return;
    }

    setGeneratingMode('local');
    const preferredCategory = categoryTouched ? formData.category : undefined;
    const draft = generateArticleDraftFromTitle(title, preferredCategory);
    if (!draft) {
      alert('Impossible de generer ce brouillon.');
      setGeneratingMode('');
      return;
    }

    applyDraftToForm(draft);
    setGenerationSourceMode('local');
    setGeneratorNote('Brouillon genere a partir du titre. Tu peux modifier tous les champs avant publication.');
    setGeneratingMode('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      alert('Vous devez être connecté pour créer un article');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;
      
      if (formData.image) {
        imageUrl = await uploadToCloudinary(formData.image);
      }

      const localSlugs = blogPosts.map((post) => post.slug);
      const baseSlug = generateUniqueSlug(formData.title, localSlugs);

      let slug = baseSlug;
      let counter = 2;

      while (await slugExistsInFirestore(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter += 1;
      }

      await addDoc(collection(db, 'blogs'), {
        title: formData.title,
        slug,
        description: formData.description,
        content: formData.content,
        category: formData.category,
        tags: formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        image: imageUrl,
        author: auth.currentUser.displayName || auth.currentUser.email,
        authorId: auth.currentUser.uid,
        generationMode: generationSourceMode,
        researchSources: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert('Article créé avec succès!');
      navigate(`/blog/${slug}`);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert('Erreur lors de la création de l\'article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-blog">
      <div className="create-blog-container">
        <h1>Créer un nouvel article</h1>
        
        <form onSubmit={handleSubmit} className="blog-form">
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="title">Titre *</label>
              <div className="draft-actions">
                <button
                  type="button"
                  onClick={handleGenerateLocalDraft}
                  className="draft-btn"
                  disabled={loading || generatingMode !== ''}
                >
                  {generatingMode === 'local' ? 'Generation locale...' : 'Generer local'}
                </button>
              </div>
            </div>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Entrez le titre de votre article"
              required
            />
            {generatorNote && <p className="generator-note">{generatorNote}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description courte *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Entrez une description courte"
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Contenu *</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Ecris ton article avec des sous-titres (##), des paragraphes et des blocs de code."
              rows="14"
              required
            />
            <p className="generator-note">Format recommande: titres `##`, etapes `###`, paragraphes courts et blocs de code.</p>
          </div>

          <div className="form-group">
            <label htmlFor="category">Catégorie</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              {articleCategories.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>
                  {categoryOption}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (separes par des virgules)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="ex: WebDev, Tutoriel, Productivite"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">Image de couverture</label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Aperçu" />
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Publication en cours...' : 'Publier l\'article'}
          </button>
        </form>
      </div>
    </div>
  );
}
