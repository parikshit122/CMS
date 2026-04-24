import AppHeader from "../components/layout/AppHeader";

const PublicLayout = ({ children }) => {
  return (
    <>
      <AppHeader variant="public" />
      {children}
    </>
  );
};

export default PublicLayout;