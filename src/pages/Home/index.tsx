import ContactBanners from "../../components/ContactBanners";
import Container from "../../components/Container";
import Brands from "./Brands";
import Faq from "./Faq";
import FeaturedProducts from "./FeaturedProducts";
import HomeHero from "./HomeHero";
import HowItWorks from "./HowItWorks";

function Home() {
  return (
    <>
      <HomeHero />
      <FeaturedProducts />
      <Brands />
      <HowItWorks />
      <div className="bg-surface pb-[clamp(48px,5vw,72px)]">
        <Container>
          <ContactBanners />
        </Container>
      </div>
      <Faq />
    </>
  );
}

export default Home;
