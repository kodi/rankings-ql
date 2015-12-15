-- MySQL dump 10.13  Distrib 5.6.27, for osx10.11 (x86_64)
--
-- Host: localhost    Database: ratings_test
-- ------------------------------------------------------
-- Server version	5.6.27

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `matches` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `game_id` char(36) DEFAULT NULL,
  `processed` tinyint(4) unsigned DEFAULT NULL,
  `server_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  KEY `processed` (`processed`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `player_rank`
--

DROP TABLE IF EXISTS `player_rank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_rank` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `player_id` char(18) DEFAULT NULL,
  `rank` int(11) DEFAULT NULL,
  `num_games` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_id` (`player_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qlstats_matches_details`
--

DROP TABLE IF EXISTS `qlstats_matches_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `qlstats_matches_details` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `damage_given` int(11) DEFAULT NULL,
  `damage_taken` int(11) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `time` int(11) DEFAULT NULL,
  `win` int(11) DEFAULT NULL,
  `player_id` char(18) DEFAULT NULL,
  `game_id` char(36) DEFAULT NULL,
  `date` int(11) DEFAULT NULL,
  `nick` varchar(256) DEFAULT NULL,
  `damage_given_adjusted` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  KEY `player_id` (`player_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2015-12-10 17:48:08
